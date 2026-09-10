import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { RequestOptions } from 'node:https';
import { resolvePublicAddresses, createPinnedLookup } from './ssrfGuard';

/**
 * Minimal JSON-RPC client.
 *
 * We deliberately avoid viem's transport here: we need to tell a network
 * failure apart from a provider 429 and from a JSON-RPC error, because each
 * leads to a different action in the report. A client that collapses all of
 * them into "request failed" cannot make that distinction.
 *
 * We also avoid global fetch, for a security reason rather than a diagnostic
 * one. This endpoint takes a URL from an untrusted caller, so it is an SSRF
 * primitive by construction. node:http gives us the two controls fetch does
 * not: a `lookup` hook to pin the socket to an address we already validated,
 * and no redirect following, so an approved public host cannot bounce us to
 * 169.254.169.254. See ssrfGuard.ts.
 */

/** Why a call failed. Each value maps to a different action. */
export type RpcFailureKind =
  /** The destination is not publicly routable and was never contacted. */
  | 'blocked'
  /** No response at all: DNS, TLS, connection refused, host does not exist. */
  | 'network'
  /** The provider did not answer within the limit. */
  | 'timeout'
  /** Answered with a non-2xx status: auth, quota, wrong path, redirect. */
  | 'http'
  /** Answered 2xx with a JSON-RPC error in the body. */
  | 'rpc'
  /** Answered 2xx but the body is not valid JSON-RPC. */
  | 'malformed';

export type RpcOutcome =
  | { ok: true; result: unknown; httpStatus: number; durationMs: number }
  | {
      ok: false;
      kind: RpcFailureKind;
      message: string;
      httpStatus?: number;
      rpcCode?: number;
      durationMs: number;
    };

const DEFAULT_TIMEOUT_MS = 8_000;

/** A JSON-RPC envelope is small. Anything larger is not one, so stop reading. */
const MAX_RESPONSE_BYTES = 256 * 1024;

/** Upper bound on any text we echo back from a third-party response. */
const MAX_ECHOED_CHARS = 200;

/**
 * Bounds and de-fangs text that came from the remote host before it enters
 * our own report. The host is untrusted even after the address check passes.
 */
function sanitize(text: string): string {
  const stripped = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim();
  return stripped.length > MAX_ECHOED_CHARS
    ? `${stripped.slice(0, MAX_ECHOED_CHARS)}…`
    : stripped;
}

interface RawResponse {
  status: number;
  statusMessage: string;
  body: string;
}

/** One HTTP round trip against an already-validated, pinned destination. */
function performRequest(
  url: URL,
  payload: string,
  timeoutMs: number,
  addresses: string[],
): Promise<RawResponse> {
  const isHttps = url.protocol === 'https:';
  const send = isHttps ? httpsRequest : httpRequest;

  const options: RequestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
      accept: 'application/json',
    },
    // Pins the socket to the addresses validated moments ago.
    lookup: createPinnedLookup(addresses),
    timeout: timeoutMs,
  };

  return new Promise<RawResponse>((resolve, reject) => {
    const req = send(options, (res) => {
      // node:http does not follow redirects, so a 3xx simply surfaces as a
      // non-2xx status. That is the behaviour we want: a redirect is the
      // classic way around a host allowlist.
      let received = 0;
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_RESPONSE_BYTES) {
          res.destroy();
          reject(Object.assign(new Error('response too large'), { kind: 'malformed' }));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          statusMessage: res.statusMessage ?? '',
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });

      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('timed out'), { kind: 'timeout' }));
    });
    req.on('error', reject);
    req.end(payload);
  });
}

/** One JSON-RPC call. Never throws: every failure comes back as an RpcOutcome. */
export async function rpcCall(
  url: string,
  method: string,
  params: unknown[] = [],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<RpcOutcome> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, kind: 'blocked', message: 'The URL is not valid.', durationMs: elapsed() };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      kind: 'blocked',
      message: `The scheme ${parsed.protocol} is not allowed. Use http or https.`,
      durationMs: elapsed(),
    };
  }

  const host = await resolvePublicAddresses(parsed.hostname);
  if (!host.ok) {
    // A name that does not resolve is a wrong URL, not a refused one.
    return host.kind === 'unresolvable'
      ? { ok: false, kind: 'network', message: `${parsed.hostname}: ${host.reason}`, durationMs: elapsed() }
      : {
          ok: false,
          kind: 'blocked',
          message: `Refused to contact ${parsed.hostname}: ${host.reason}.`,
          durationMs: elapsed(),
        };
  }

  let response: RawResponse;
  try {
    response = await performRequest(
      parsed,
      JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      timeoutMs,
      host.addresses,
    );
  } catch (error) {
    const kind = (error as { kind?: RpcFailureKind }).kind;
    if (kind === 'timeout') {
      return { ok: false, kind: 'timeout', message: `No response within ${timeoutMs} ms`, durationMs: elapsed() };
    }
    if (kind === 'malformed') {
      return {
        ok: false,
        kind: 'malformed',
        message: 'The response was too large to be a JSON-RPC envelope',
        durationMs: elapsed(),
      };
    }
    return {
      ok: false,
      kind: 'network',
      message: error instanceof Error ? sanitize(error.message) : 'Unknown network failure',
      durationMs: elapsed(),
    };
  }

  if (response.status < 200 || response.status >= 300) {
    return {
      ok: false,
      kind: 'http',
      message: sanitize(`The provider answered HTTP ${response.status} ${response.statusMessage}`),
      httpStatus: response.status,
      durationMs: elapsed(),
    };
  }

  let body: unknown;
  try {
    body = JSON.parse(response.body);
  } catch {
    return {
      ok: false,
      kind: 'malformed',
      message: 'The provider answered 2xx but the body is not JSON',
      httpStatus: response.status,
      durationMs: elapsed(),
    };
  }

  if (typeof body !== 'object' || body === null) {
    return {
      ok: false,
      kind: 'malformed',
      message: 'The JSON-RPC response is not an object',
      httpStatus: response.status,
      durationMs: elapsed(),
    };
  }

  const payload = body as { result?: unknown; error?: { code?: number; message?: string } };

  if (payload.error) {
    return {
      ok: false,
      kind: 'rpc',
      message: sanitize(
        typeof payload.error.message === 'string'
          ? payload.error.message
          : 'JSON-RPC error with no message',
      ),
      httpStatus: response.status,
      rpcCode: typeof payload.error.code === 'number' ? payload.error.code : undefined,
      durationMs: elapsed(),
    };
  }

  if (!('result' in payload)) {
    return {
      ok: false,
      kind: 'malformed',
      message: 'The JSON-RPC response carries neither result nor error',
      httpStatus: response.status,
      durationMs: elapsed(),
    };
  }

  return {
    ok: true,
    result: payload.result,
    httpStatus: response.status,
    durationMs: elapsed(),
  };
}

/** True for a well-formed hex quantity, the only shape we echo back verbatim. */
export function isHexQuantity(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

/**
 * Hides credentials embedded in an RPC URL before displaying it or sending
 * it to a third party. Many providers put the API key in the path
 * (…/v2/<key>) or in the query string, and the report is public.
 */
export function redactRpcUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return '(invalid URL)';
  }

  parsed.username = '';
  parsed.password = '';

  for (const key of [...parsed.searchParams.keys()]) {
    parsed.searchParams.set(key, '***');
  }

  // A long opaque segment at the end of the path is almost always an API key.
  const segments = parsed.pathname.split('/');
  const last = segments[segments.length - 1];
  if (last && last.length >= 16 && /^[A-Za-z0-9_-]+$/.test(last)) {
    segments[segments.length - 1] = '***';
    parsed.pathname = segments.join('/');
  }

  return parsed.toString();
}
