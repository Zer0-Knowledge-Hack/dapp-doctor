/**
 * Data model for the DApp Doctor diagnostic engine.
 *
 * A check is deterministic: given the same network in the same state, it
 * returns the same result. No check infers or guesses; when it cannot run,
 * it says so with NOT_TESTED instead of assuming.
 */

/** Result of a single check. */
export type CheckOutcome = 'PASS' | 'WARN' | 'FAIL' | 'NOT_TESTED';

/** Aggregated status of the whole diagnosis. */
export type OverallStatus = 'READY' | 'AT_RISK' | 'BLOCKED' | 'NOT_TESTED';

/** Stable identifier for each check, used in reports and evaluation. */
export type CheckId =
  | 'access'
  | 'network-identity'
  | 'node-freshness'
  | 'contract-bytecode'
  | 'critical-read'
  | 'fallback';

export interface CheckResult {
  id: CheckId;
  /** Human-readable name. */
  title: string;
  outcome: CheckOutcome;
  /** One line: what was observed. No speculation about the cause. */
  summary: string;
  /** What to do about it. Empty when the outcome is PASS. */
  action?: string;
  /** Raw observed data, so the report stays auditable. */
  observed?: Record<string, unknown>;
  /** How long the check took, in milliseconds. */
  durationMs: number;
  /**
   * A critical check in FAIL blocks the whole diagnosis.
   * A non-critical one only puts it at risk.
   */
  critical: boolean;
}

export interface DiagnoseTarget {
  /** Primary RPC the application uses. */
  rpcUrl: string;
  /** Secondary RPC, optional. Enables the fallback check. */
  fallbackRpcUrl?: string;
  /** Chain ID the application expects. The heart of the demo bug. */
  expectedChainId: number;
  /** Contract to verify. Optional: without it, bytecode and read do not run. */
  contractAddress?: string;
  /**
   * Critical read to execute against the contract. Optional.
   * Expressed as a zero-argument function signature to keep the scope
   * read-only and avoid arbitrary encodings.
   */
  criticalRead?: {
    /** Example: "getMessage() returns (string)". */
    signature: string;
  };
  /**
   * Maximum tolerated age of the latest block, in seconds.
   * Defaults to 60: Base produces a block every ~2s, so 60s already
   * signals a lagging node rather than normal variation.
   */
  maxBlockAgeSeconds?: number;
}

export interface DiagnosisReport {
  status: OverallStatus;
  /** One line explaining the aggregated status. */
  headline: string;
  target: DiagnoseTarget;
  checks: CheckResult[];
  startedAt: string;
  durationMs: number;
}
