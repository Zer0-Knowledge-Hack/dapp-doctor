/**
 * What kind of endpoint an RPC URL is, as far as launching goes.
 *
 * Pure and offline: decided from the URL alone, never by calling it.
 */

export interface SharedEndpoint {
  /** Human name for the report. */
  label: string;
  /**
   * True only for Base's own public endpoints, the one case where Base's
   * documentation can be cited: it states that public endpoints do not offer
   * WebSocket subscriptions. Nothing is attributed to Base for other hosts.
   */
  isBasePublic: boolean;
}

/** A path segment this long and opaque is an API key, which makes the endpoint dedicated. */
function hasKeyInPath(url: URL): boolean {
  return url.pathname.split('/').some((segment) => segment.length >= 20 && /^[A-Za-z0-9_-]+$/.test(segment));
}

/**
 * Known free, shared, keyless endpoints. Conservative on purpose: a host
 * missing from this list is never flagged, so an unknown endpoint is assumed
 * dedicated rather than accused of being public.
 */
const SHARED: Array<{ label: string; isBasePublic?: boolean; matches: (url: URL) => boolean }> = [
  { label: "Base's public endpoint", isBasePublic: true, matches: (u) => u.hostname === 'mainnet.base.org' || u.hostname === 'sepolia.base.org' },
  { label: 'PublicNode', matches: (u) => u.hostname.endsWith('.publicnode.com') },
  { label: 'LlamaRPC', matches: (u) => u.hostname === 'llamarpc.com' || u.hostname.endsWith('.llamarpc.com') },
  { label: 'Cloudflare', matches: (u) => u.hostname === 'cloudflare-eth.com' },
  { label: '1RPC', matches: (u) => u.hostname === '1rpc.io' },
  { label: 'Ankr without a key', matches: (u) => u.hostname === 'rpc.ankr.com' && !hasKeyInPath(u) },
  { label: 'dRPC without a key', matches: (u) => u.hostname.endsWith('.drpc.org') && !u.searchParams.has('dkey') },
];

export function sharedEndpoint(rawUrl: string): SharedEndpoint | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const known = SHARED.find((entry) => entry.matches(url));
  return known ? { label: known.label, isBasePublic: Boolean(known.isBasePublic) } : null;
}

/**
 * The provider behind a URL, approximated by the last two labels of the
 * hostname: base-mainnet.g.alchemy.com and eth-mainnet.g.alchemy.com are both
 * alchemy.com, so they fail together. Good enough for RPC providers, whose
 * domains do not use multi-part public suffixes.
 */
export function providerDomain(rawUrl: string): string | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.replace(/\.$/, '');
  } catch {
    return null;
  }
  if (/^[\d.]+$/.test(host) || host.includes(':')) return host;
  return host.split('.').slice(-2).join('.');
}

/** Hostname only: never the path or query, which is where API keys live. */
export function hostOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '(invalid URL)';
  }
}
