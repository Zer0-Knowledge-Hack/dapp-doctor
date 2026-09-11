/**
 * RPC Heartbeat: a chain's vital signs, read from its latest block.
 *
 * Pure functions only. The page polls the RPC and feeds blocks in; everything
 * shown on the monitor is decided here, so it can be tested without a network
 * or a speaker. Every number comes from the chain itself, never from how fast
 * our own polling happens to run.
 */

export interface BlockSample {
  number: number;
  /** Block timestamp, in seconds, as the chain reports it. */
  timestamp: number;
  gasUsed: number;
  gasLimit: number;
  txCount: number;
}

/** How the patient is doing. */
export type Pulse = 'waiting' | 'alive' | 'coma' | 'flatline';

const HEX = /^0x[0-9a-fA-F]{1,16}$/;

function hexToNumber(value: unknown): number | null {
  if (typeof value !== 'string' || !HEX.test(value)) return null;
  const parsed = Number.parseInt(value, 16);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Reads the fields the monitor needs from an `eth_getBlockByNumber` result.
 * Anything malformed is refused rather than drawn: a third-party response is
 * never trusted just because it arrived.
 */
export function parseBlock(raw: unknown): BlockSample | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const block = raw as Record<string, unknown>;
  const number = hexToNumber(block.number);
  const timestamp = hexToNumber(block.timestamp);
  const gasUsed = hexToNumber(block.gasUsed);
  const gasLimit = hexToNumber(block.gasLimit);
  if (number === null || timestamp === null || gasUsed === null || gasLimit === null) return null;
  if (!Array.isArray(block.transactions)) return null;
  return { number, timestamp, gasUsed, gasLimit, txCount: block.transactions.length };
}

/**
 * Blocks per minute over the samples seen, from the chain's own numbers and
 * timestamps. Using the block-number difference means a poll that skipped a
 * block still counts it.
 */
export function heartRate(samples: BlockSample[]): number | null {
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const blocks = last.number - first.number;
  const seconds = last.timestamp - first.timestamp;
  if (blocks <= 0 || seconds <= 0) return null;
  return (blocks / seconds) * 60;
}

/** Share of the block's gas limit used, 0 to 1. */
export function fullness(sample: BlockSample): number {
  if (sample.gasLimit <= 0) return 0;
  return Math.min(1, Math.max(0, sample.gasUsed / sample.gasLimit));
}

/** How tall the spike is: a busy block beats harder. Logarithmic, so one huge block cannot flatten the rest. */
export function amplitude(txCount: number): number {
  const scaled = Math.log10(1 + Math.max(0, txCount)) / Math.log10(1 + 400);
  return 0.35 + 0.85 * Math.min(1, scaled);
}

/** Pitch of the beep, in hertz: fuller blocks sound higher. */
export function pitch(share: number): number {
  return 660 + 440 * Math.min(1, Math.max(0, share));
}

/** Failed polls in a row before the monitor calls it a flatline. */
export const FLATLINE_AFTER_FAILURES = 3;

/**
 * Seconds without a new block before a node that still answers is "in a
 * coma": alive, but the chain it shows has stopped moving. Five block times,
 * never less than 30 s, the same spirit as the diagnosis's freshness check.
 */
export function comaAfterSeconds(expectedBlockSeconds: number): number {
  return Math.max(30, expectedBlockSeconds * 5);
}

export function pulseState(input: {
  latest: BlockSample | null;
  consecutiveFailures: number;
  nowSeconds: number;
  expectedBlockSeconds: number;
}): Pulse {
  if (input.consecutiveFailures >= FLATLINE_AFTER_FAILURES) return 'flatline';
  if (!input.latest) return 'waiting';
  const age = input.nowSeconds - input.latest.timestamp;
  return age > comaAfterSeconds(input.expectedBlockSeconds) ? 'coma' : 'alive';
}

/** How often to ask for the latest block: twice per block time, between 1 and 4 seconds. */
export function pollIntervalMs(expectedBlockSeconds: number): number {
  return Math.min(4000, Math.max(1000, (expectedBlockSeconds * 1000) / 2));
}
