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

  const segments = parsed.pathname.split('/');
  const last = segments[segments.length - 1];
  if (last && last.length >= 16 && /^[A-Za-z0-9_-]+$/.test(last)) {
    segments[segments.length - 1] = '***';
    parsed.pathname = segments.join('/');
  }

  return parsed.toString();
}
