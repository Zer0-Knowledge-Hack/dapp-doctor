import { blockedAddressReason, resolvePublicAddresses } from '../src/lib/diagnostics/ssrfGuard';
import { rpcCall } from '../src/lib/diagnostics/rpc';

/**
 * Proves the SSRF guard refuses every destination that is not publicly
 * routable. These run offline: a blocked address must be rejected before any
 * socket is opened, so nothing here should ever touch the network.
 */

let failures = 0;

function check(name: string, actual: boolean, expected: boolean, detail = '') {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${detail ? `  — ${detail}` : ''}`);
}

console.log('--- addresses that must be refused ---');
const mustBlock = [
  '127.0.0.1',
  '127.1.2.3',
  '0.0.0.0',
  '10.0.0.7',
  '172.16.0.1',
  '172.31.255.254',
  '192.168.1.1',
  '169.254.169.254', // AWS / GCP / Azure instance metadata
  '100.64.0.1',
  '224.0.0.1',
  '255.255.255.255',
  '::1',
  '::',
  'fe80::1',
  'fc00::1',
  'fd12:3456::1',
  'ff02::1',
  '::ffff:127.0.0.1', // IPv4-mapped loopback
  '::ffff:169.254.169.254', // IPv4-mapped metadata
  '64:ff9b::127.0.0.1', // NAT64 loopback
  '2002:7f00:0001::', // 6to4
];
for (const address of mustBlock) {
  const reason = blockedAddressReason(address);
  check(`block ${address}`, reason !== null, true, reason ?? 'NOT BLOCKED');
}

console.log('\n--- addresses that must be allowed ---');
const mustAllow = ['1.1.1.1', '8.8.8.8', '104.16.0.1', '2606:4700:4700::1111'];
for (const address of mustAllow) {
  const reason = blockedAddressReason(address);
  check(`allow ${address}`, reason === null, true, reason ?? '');
}

console.log('\n--- hostname resolution ---');
const localhost = await resolvePublicAddresses('localhost');
check('localhost refused', localhost.ok, false, localhost.ok ? '' : localhost.reason);

const publicHost = await resolvePublicAddresses('mainnet.base.org');
check('mainnet.base.org allowed', publicHost.ok, true, publicHost.ok ? '' : publicHost.reason);

const subLocalhost = await resolvePublicAddresses('rpc.localhost');
check('*.localhost refused (RFC 6761 loopback)', subLocalhost.ok, false, subLocalhost.ok ? '' : subLocalhost.reason);

console.log('\n--- dead hostnames must not delay healthy ones ---');
{
  // Regression: with dns.lookup, six slow-failing lookups held libuv's thread
  // pool and mainnet.base.org took 23 s, so a healthy RPC was diagnosed as
  // "did not answer". Resolution must not queue behind other requests.
  const dead = Array.from({ length: 6 }, (_, i) =>
    resolvePublicAddresses(`dead-${i}-${Date.now()}.example-rpc.com`),
  );
  const started = Date.now();
  const healthy = await resolvePublicAddresses('mainnet.base.org');
  const elapsed = Date.now() - started;
  check(`healthy host resolves while dead lookups are pending (${elapsed} ms)`, healthy.ok && elapsed < 2000, true);
  await Promise.all(dead);
}

console.log('\n--- end to end through rpcCall ---');
const attacks = [
  'http://169.254.169.254/latest/meta-data/',
  'http://127.0.0.1:6379/',
  'http://localhost:3000/api/diagnose',
  'http://[::1]:8545/',
  'http://10.0.0.1/',
  'file:///etc/passwd',
];
for (const url of attacks) {
  const outcome = await rpcCall(url, 'eth_blockNumber');
  const blocked = !outcome.ok && outcome.kind === 'blocked';
  check(`rpcCall refuses ${url}`, blocked, true, outcome.ok ? 'REQUEST WENT THROUGH' : outcome.message);
}

console.log(`\n=== ${failures === 0 ? 'all guard checks passed' : `${failures} guard check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
