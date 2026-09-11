/**
 * Browser-side JSON-RPC for the heartbeat. Import only from client components.
 *
 * The request goes from the viewer's browser straight to the RPC they chose:
 * nothing passes through our servers, so a pasted URL (and any key in it)
 * never leaves their machine. Two read-only methods, and nothing else:
 * `eth_chainId` and `eth_getBlockByNumber`.
 */

export type ReadResult = { ok: true; result: unknown } | { ok: false; reason: string };

type ReadMethod = 'eth_chainId' | 'eth_getBlockByNumber';

const TIMEOUT_MS = 4000;
/** A block with its transaction hashes is tens of kilobytes. Anything far larger is not an RPC answer. */
const MAX_RESPONSE_CHARS = 1_000_000;

export function isListenableUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export async function readRpc(url: string, method: ReadMethod, params: unknown[] = []): Promise<ReadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      cache: 'no-store',
      // Never send cookies to a third-party RPC, and never follow it elsewhere.
      credentials: 'omit',
      redirect: 'error',
    });
    if (!response.ok) return { ok: false, reason: `The RPC answered HTTP ${response.status}.` };
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) return { ok: false, reason: 'The RPC sent a response far too large to be a block.' };
    const body = JSON.parse(text) as { result?: unknown; error?: unknown };
    if (body.error !== undefined || body.result === undefined) return { ok: false, reason: 'The RPC answered with an error.' };
    return { ok: true, result: body.result };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, reason: `No answer within ${TIMEOUT_MS / 1000} seconds.` };
    }
    if (error instanceof SyntaxError) return { ok: false, reason: 'The RPC answered with something that is not JSON.' };
    // A browser reports DNS failures, refused connections and CORS refusals
    // identically, so the message names all of them rather than guessing one.
    return { ok: false, reason: 'No answer: the address is unreachable, or it refuses requests from a browser.' };
  } finally {
    clearTimeout(timer);
  }
}
