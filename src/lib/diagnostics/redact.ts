/**
 * Hides credentials embedded in an RPC URL before displaying it or sending
 * it to a third party. Many providers put the API key in the path
 * (…/v2/<key>) or in the query string, and the report is public.
 *
 * Lives in its own module so the browser can redact without importing the
 * Node RPC client.
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

  // Any long opaque path segment is almost always a key, wherever it sits:
  // Alchemy ends with it (/v2/<key>), QuickNode and GetBlock put it before a
  // trailing slash (/<token>/), some providers follow it with more path. Only
  // checking the last segment let those through.
  parsed.pathname = parsed.pathname
    .split('/')
    .map((segment) => (segment.length >= 16 && /^[A-Za-z0-9_-]+$/.test(segment) ? '***' : segment))
    .join('/');

  return parsed.toString();
}
