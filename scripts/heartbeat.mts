import { PATIENTS } from '../src/lib/heartbeat/patients';
import {
  amplitude,
  comaAfterSeconds,
  FLATLINE_AFTER_FAILURES,
  fullness,
  heartRate,
  parseBlock,
  pitch,
  pollIntervalMs,
  pulseState,
  type BlockSample,
} from '../src/lib/heartbeat/vitals';

/**
 * RPC Heartbeat draws a beat only for a block the chain really produced, so
 * what is proven here is the reading of vital signs: malformed answers are
 * refused, rates come from the chain's own clock, and the states flip at the
 * thresholds the page promises.
 */

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

const hex = (n: number) => `0x${n.toString(16)}`;
const rawBlock = (number: number, timestamp: number, txs = 10, gasUsed = 15_000_000, gasLimit = 30_000_000) => ({
  number: hex(number),
  timestamp: hex(timestamp),
  gasUsed: hex(gasUsed),
  gasLimit: hex(gasLimit),
  transactions: Array.from({ length: txs }, (_, i) => `0x${String(i).padStart(64, '0')}`),
});
const sample = (number: number, timestamp: number): BlockSample => parseBlock(rawBlock(number, timestamp)) as BlockSample;

console.log('--- reading a block ---');
{
  const block = parseBlock(rawBlock(100, 1_700_000_000, 42));
  check('a well-formed block is read', block?.number === 100 && block.txCount === 42 && block.timestamp === 1_700_000_000);
}
check('null is refused', parseBlock(null) === null);
check('a non-hex number is refused', parseBlock({ ...rawBlock(1, 1), number: '100' }) === null);
check('a missing timestamp is refused', parseBlock({ ...rawBlock(1, 1), timestamp: undefined }) === null);
check('transactions that are not a list are refused', parseBlock({ ...rawBlock(1, 1), transactions: 'lots' }) === null);
check('an absurdly long hex value is refused', parseBlock({ ...rawBlock(1, 1), gasUsed: `0x${'f'.repeat(40)}` }) === null);

console.log('\n--- heart rate, from the chain clock ---');
{
  const base = [sample(10, 1000), sample(11, 1002), sample(12, 1004), sample(13, 1006)];
  check('Base at 2 s per block beats 30 per minute', heartRate(base) === 30, String(heartRate(base)));
  const eth = [sample(500, 0), sample(501, 12), sample(502, 24)];
  check('Ethereum at 12 s per block beats 5 per minute', heartRate(eth) === 5, String(heartRate(eth)));
  const skipped = [sample(10, 1000), sample(13, 1006)];
  check('a poll that skipped blocks still counts them', heartRate(skipped) === 30);
  check('one sample gives no rate yet', heartRate([sample(1, 1)]) === null);
  check('no time passing gives no rate', heartRate([sample(1, 5), sample(2, 5)]) === null);
}

console.log('\n--- how it sounds and looks ---');
check('an empty block still beats, softly', amplitude(0) > 0.3 && amplitude(0) < 0.4);
check('a busier block beats harder', amplitude(200) > amplitude(10));
check('a giant block is capped', amplitude(100_000) <= 1.2);
check('a half-full block is half full', fullness(sample(1, 1)) === 0.5);
check('a zero gas limit does not divide by zero', fullness({ number: 1, timestamp: 1, gasUsed: 5, gasLimit: 0, txCount: 0 }) === 0);
check('fuller blocks sound higher', pitch(1) > pitch(0) && pitch(0) === 660 && pitch(1) === 1100);

console.log('\n--- the states the page promises ---');
{
  const now = 10_000;
  const fresh = sample(1, now - 2);
  check('no block yet is waiting', pulseState({ latest: null, consecutiveFailures: 0, nowSeconds: now, expectedBlockSeconds: 2 }) === 'waiting');
  check('a fresh block is alive', pulseState({ latest: fresh, consecutiveFailures: 0, nowSeconds: now, expectedBlockSeconds: 2 }) === 'alive');
  check(`${FLATLINE_AFTER_FAILURES} failures in a row is a flatline`,
    pulseState({ latest: fresh, consecutiveFailures: FLATLINE_AFTER_FAILURES, nowSeconds: now, expectedBlockSeconds: 2 }) === 'flatline');
  check('two failures are not a flatline yet',
    pulseState({ latest: fresh, consecutiveFailures: 2, nowSeconds: now, expectedBlockSeconds: 2 }) === 'alive');
  const stale = sample(1, now - 31);
  check('Base with no new block for 31 s is in a coma', pulseState({ latest: stale, consecutiveFailures: 0, nowSeconds: now, expectedBlockSeconds: 2 }) === 'coma');
  check('Ethereum is not in a coma between two 12 s blocks',
    pulseState({ latest: sample(1, now - 24), consecutiveFailures: 0, nowSeconds: now, expectedBlockSeconds: 12 }) === 'alive');
  check('the coma threshold is never under 30 s', comaAfterSeconds(1) === 30 && comaAfterSeconds(12) === 60);
}

console.log('\n--- polling pace and patients ---');
check('Base is asked every second', pollIntervalMs(2) === 1000);
check('Ethereum is asked every 4 s, not every second', pollIntervalMs(12) === 4000);
check('every living patient is served over https', PATIENTS.filter((p) => p.id !== 'dead').every((p) => p.rpcUrl.startsWith('https://')));
check('the dead patient uses a reserved address that never resolves', PATIENTS.some((p) => p.id === 'dead' && new URL(p.rpcUrl).hostname.endsWith('.invalid')));

console.log(`\n=== ${failures === 0 ? 'all heartbeat checks passed' : `${failures} heartbeat check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
