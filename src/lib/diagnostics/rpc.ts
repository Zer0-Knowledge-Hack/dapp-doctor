/**
 * Minimal JSON-RPC client.
 *
 * We deliberately avoid viem's transport here: we need to tell a network
 * failure apart from a provider 429 and from a JSON-RPC error, because each
 * leads to a different action in the report. A client that collapses all of
 * them into "request failed" cannot make that distinction.
 */

/** Why a call failed. Each value maps to a different action. */
export type RpcFailureKind =
  /** No response at all: DNS, TLS, connection refused, host does not exist. */
  | 'network'
  /** The provider did not answer within the limit. */
  | 'timeout'
  /** Answered with a non-2xx status: auth, quota, wrong path. */
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

/** One JSON-RPC call. Never throws: every failure comes back as an RpcOutcome. */
export async function rpcCall(
  url: string,
  method: string,
  params: unknown[] = [],
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<RpcOutcome> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        kind: 'http',
        message: `The provider answered HTTP ${response.status} ${response.statusText}`.trim(),
        httpStatus: response.status,
        durationMs,
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        kind: 'malformed',
        message: 'The provider answered 2xx but the body is not JSON',
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
      };
    }

    if (typeof body !== 'object' || body === null) {
      return {
        ok: false,
        kind: 'malformed',
        message: 'The JSON-RPC response is not an object',
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
      };
    }

    const payload = body as { result?: unknown; error?: { code?: number; message?: string } };

    if (payload.error) {
      return {
        ok: false,
        kind: 'rpc',
        message: payload.error.message ?? 'JSON-RPC error with no message',
        httpStatus: response.status,
        rpcCode: payload.error.code,
        durationMs: Date.now() - startedAt,
      };
    }

    if (!('result' in payload)) {
      return {
        ok: false,
        kind: 'malformed',
        message: 'The JSON-RPC response carries neither result nor error',
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
      };
    }

    return {
      ok: true,
      result: payload.result,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      kind: aborted ? 'timeout' : 'network',
      message: aborted
        ? `No response within ${timeoutMs} ms`
        : error instanceof Error
          ? error.message
          : 'Unknown network failure',
      durationMs,
    };
  } finally {
    clearTimeout(timer);
  }
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
