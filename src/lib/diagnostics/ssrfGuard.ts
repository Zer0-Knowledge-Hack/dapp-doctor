import { isIPv4, isIPv6 } from 'node:net';
import { Resolver } from 'node:dns/promises';
import type { LookupFunction } from 'node:net';

/**
 * SSRF guard.
 *
 * The product deliberately points at any RPC the user names, so an allowlist
 * is not viable. What is viable is refusing destinations that are not
 * reachable from the public internet in the first place: loopback,
 * link-local (cloud metadata lives at 169.254.169.254), private ranges and
 * the rest of the reserved space.
 *
 * Two things have to happen for this to actually hold:
 *
 * 1. Every address the hostname resolves to is checked, not just the first.
 *    A host with one public and one private A record must be refused.
 * 2. The connection is pinned to the addresses we checked. Otherwise a
 *    hostname can answer with a public address during validation and a
 *    private one microseconds later, when the socket is opened — DNS
 *    rebinding. `createPinnedLookup` is what closes that window.
 */

interface Cidr {
  base: number;
  bits: number;
  label: string;
}

/** IPv4 space that never belongs to a legitimate public RPC provider. */
const BLOCKED_IPV4: Cidr[] = [
  { base: 0x00000000, bits: 8, label: 'this-network' },
  { base: 0x0a000000, bits: 8, label: 'private 10/8' },
  { base: 0x64400000, bits: 10, label: 'carrier-grade NAT' },
  { base: 0x7f000000, bits: 8, label: 'loopback' },
  { base: 0xa9fe0000, bits: 16, label: 'link-local / cloud metadata' },
  { base: 0xac100000, bits: 12, label: 'private 172.16/12' },
  { base: 0xc0000000, bits: 24, label: 'IETF protocol assignments' },
  { base: 0xc0000200, bits: 24, label: 'TEST-NET-1' },
  { base: 0xc0a80000, bits: 16, label: 'private 192.168/16' },
  { base: 0xc6120000, bits: 15, label: 'benchmarking' },
  { base: 0xc6336400, bits: 24, label: 'TEST-NET-2' },
  { base: 0xcb007100, bits: 24, label: 'TEST-NET-3' },
  { base: 0xe0000000, bits: 4, label: 'multicast' },
  { base: 0xf0000000, bits: 4, label: 'reserved' },
];

function ipv4ToInt(address: string): number | null {
  const octets = address.split('.');
  if (octets.length !== 4) return null;
  let value = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const n = Number(octet);
    if (n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function blockedIPv4Reason(address: string): string | null {
  const value = ipv4ToInt(address);
  if (value === null) return 'unparseable IPv4 address';
  for (const { base, bits, label } of BLOCKED_IPV4) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) >>> 0 === (base & mask) >>> 0) return label;
  }
  return null;
}

/** Expands any IPv6 form, including embedded IPv4, into eight 16-bit groups. */
function expandIPv6(address: string): number[] | null {
  let ip = address;

  const zone = ip.indexOf('%');
  if (zone !== -1) ip = ip.slice(0, zone);

  // "::ffff:192.168.0.1" — rewrite the trailing IPv4 as two hex groups.
  const lastColon = ip.lastIndexOf(':');
  if (lastColon !== -1 && ip.slice(lastColon + 1).includes('.')) {
    const embedded = ipv4ToInt(ip.slice(lastColon + 1));
    if (embedded === null) return null;
    ip = `${ip.slice(0, lastColon + 1)}${(embedded >>> 16).toString(16)}:${(embedded & 0xffff).toString(16)}`;
  }

  const halves = ip.split('::');
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];

  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    groups = [...head, ...Array<string>(fill).fill('0'), ...tail];
  }

  if (groups.length !== 8) return null;

  const values: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    values.push(parseInt(group, 16));
  }
  return values;
}

function blockedIPv6Reason(address: string): string | null {
  const g = expandIPv6(address);
  if (g === null) return 'unparseable IPv6 address';

  if (g.every((group) => group === 0)) return 'unspecified address';
  if (g.slice(0, 7).every((group) => group === 0) && g[7] === 1) return 'loopback';
  if ((g[0] & 0xfe00) === 0xfc00) return 'unique local';
  if ((g[0] & 0xffc0) === 0xfe80) return 'link-local';
  if ((g[0] & 0xff00) === 0xff00) return 'multicast';
  // 6to4 tunnels an arbitrary IPv4 destination; deprecated, refuse outright.
  if (g[0] === 0x2002) return '6to4';

  // IPv4-mapped (::ffff:0:0/96) and NAT64 (64:ff9b::/96) both carry a real
  // IPv4 destination in the last 32 bits, so it has to be checked as IPv4.
  const isMapped = g.slice(0, 5).every((group) => group === 0) && g[5] === 0xffff;
  const isNat64 = g[0] === 0x0064 && g[1] === 0xff9b && g.slice(2, 6).every((group) => group === 0);
  if (isMapped || isNat64) {
    const embedded = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return blockedIPv4Reason(embedded);
  }

  return null;
}

/** Why this address must not be contacted, or null if it is fine. */
export function blockedAddressReason(address: string): string | null {
  if (isIPv4(address)) return blockedIPv4Reason(address);
  if (isIPv6(address)) return blockedIPv6Reason(address);
  return 'not an IP address';
}

/**
 * Hostnames are resolved with c-ares (`Resolver`), never `dns.lookup`.
 *
 * `dns.lookup` runs getaddrinfo on libuv's thread pool — four threads shared
 * by the whole process — and a lookup cannot be cancelled. A few hostnames that
 * are slow to fail (typos, dead domains, or ones sent on purpose) hold every
 * thread, and a healthy hostname queued behind them stalls: measured at 23 s
 * for mainnet.base.org behind six dead lookups. The diagnosis then reports
 * "the RPC did not answer" about an RPC that is fine — confidently wrong, the
 * one thing this product must never be. c-ares queries DNS on the event loop
 * instead: the same case resolved in 7 ms, and pending queries are cancelled
 * once the time budget runs out.
 *
 * c-ares skips the hosts file. That is right for public RPC hostnames, and the
 * one name that matters there, localhost, is refused explicitly below.
 */
const DNS_TIMEOUT_MS = 3_000;

async function resolveHostname(hostname: string): Promise<{ addresses: string[]; timedOut: boolean }> {
  const resolver = new Resolver({ timeout: 1_500, tries: 2 });
  const timer = setTimeout(() => resolver.cancel(), DNS_TIMEOUT_MS);
  try {
    const answers = await Promise.allSettled([resolver.resolve4(hostname), resolver.resolve6(hostname)]);
    const addresses = answers.flatMap((answer) => (answer.status === 'fulfilled' ? answer.value : []));
    const timedOut = answers.some(
      (answer) =>
        answer.status === 'rejected' &&
        ['ETIMEOUT', 'ECANCELLED'].includes((answer.reason as NodeJS.ErrnoException | undefined)?.code ?? ''),
    );
    return { addresses, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

export type HostCheck =
  | { ok: true; addresses: string[] }
  /**
   * `unresolvable` is a plain lookup failure — a typo in the URL. `blocked`
   * means it resolved fine and we are refusing it. Keeping them apart matters:
   * a diagnostic tool that tells someone "we only contact public hosts" when
   * they simply misspelled the hostname has given them the wrong cause.
   */
  | { ok: false; kind: 'unresolvable' | 'blocked'; reason: string };

/**
 * Resolves a hostname and refuses it unless *every* address it maps to is
 * publicly routable. Returns the exact addresses that were approved, so the
 * caller can pin the connection to them.
 */
export async function resolvePublicAddresses(hostname: string): Promise<HostCheck> {
  const literal = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  // An IP literal needs no DNS round trip, and must not get one: resolving it
  // would be a second chance to answer with something else.
  if (isIPv4(literal) || isIPv6(literal)) {
    const reason = blockedAddressReason(literal);
    return reason ? { ok: false, kind: 'blocked', reason } : { ok: true, addresses: [literal] };
  }

  // c-ares does not read the hosts file, so loopback names are refused by
  // name. RFC 6761 reserves every *.localhost name for loopback too.
  const name = literal.toLowerCase().replace(/\.$/, '');
  if (name === 'localhost' || name.endsWith('.localhost')) {
    return { ok: false, kind: 'blocked', reason: 'loopback' };
  }

  const { addresses, timedOut } = await resolveHostname(name);

  if (addresses.length === 0) {
    return {
      ok: false,
      kind: 'unresolvable',
      reason: timedOut ? `the hostname did not resolve within ${DNS_TIMEOUT_MS} ms` : 'the hostname does not resolve',
    };
  }

  for (const address of addresses) {
    const reason = blockedAddressReason(address);
    if (reason) return { ok: false, kind: 'blocked', reason };
  }

  return { ok: true, addresses };
}

/**
 * A lookup that only ever hands back addresses already validated above.
 * Passed to the HTTP request so the socket cannot be opened against an
 * address that appeared after the check — this is the anti-rebinding pin.
 */
export function createPinnedLookup(addresses: string[]): LookupFunction {
  return ((hostname, options, callback) => {
    const done = typeof options === 'function' ? options : callback;
    const wantsAll = typeof options === 'object' && options !== null && options.all === true;

    const entries = addresses.map((address) => ({
      address,
      family: isIPv4(address) ? 4 : 6,
    }));

    if (entries.length === 0) {
      done(new Error('no validated address available'), '', 0);
      return;
    }

    if (wantsAll) {
      done(null, entries as never, 0 as never);
    } else {
      done(null, entries[0].address, entries[0].family);
    }
  }) as LookupFunction;
}
