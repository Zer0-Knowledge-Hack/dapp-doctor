import { runDiagnosis } from '../diagnostics/engine';
import type { DiagnoseTarget, DiagnosisReport, OverallStatus } from '../diagnostics/types';
import { evaluateLaunch, launchMaxBlockAge, type LaunchRule } from './rules';

export interface LaunchReport {
  status: OverallStatus;
  headline: string;
  rules: LaunchRule[];
  /** The six checks, run at launch strictness. Their verdicts count toward the launch status. */
  diagnosis: DiagnosisReport;
  startedAt: string;
  durationMs: number;
}

/** Runs the six checks at launch strictness, then judges the result against the launch rules. */
export async function runLaunchCheck(target: DiagnoseTarget): Promise<LaunchReport> {
  const startedAt = new Date();
  const started = Date.now();

  const diagnosis = await runDiagnosis({ ...target, maxBlockAgeSeconds: launchMaxBlockAge(target) });
  const verdict = evaluateLaunch(diagnosis);

  return {
    ...verdict,
    diagnosis,
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - started,
  };
}
