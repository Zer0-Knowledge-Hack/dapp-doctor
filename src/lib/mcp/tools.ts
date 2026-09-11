import { runDiagnosis } from '../diagnostics/engine';
import { compareReports } from '../diagnostics/compare';
import { parseTarget } from '../diagnostics/parseTarget';
import { extractFromText } from '../intake/extract';
import { describeSecrets, findSecrets } from './secrets';
import { formatComparison, formatExtraction, formatReport } from './format';

/**
 * What each MCP tool does, independent of the transport, so it can be tested
 * without speaking the protocol. The route only wires these to tool names.
 *
 * Every tool reaches the network through the same engine as the web app, so
 * the SSRF guard applies to agents exactly as it does to browsers.
 */

export interface ToolResult {
  text: string;
  isError: boolean;
}

export interface TargetInput {
  rpcUrl: string;
  expectedChainId: number;
  contractAddress?: string;
  criticalReadSignature?: string;
  fallbackRpcUrl?: string;
}

const error = (text: string): ToolResult => ({ text, isError: true });

export async function diagnoseRpc(input: TargetInput): Promise<ToolResult> {
  // The signature is free text: if an agent puts a secret there by mistake,
  // refuse it rather than echo it back inside an "invalid signature" error.
  if (input.criticalReadSignature) {
    const secrets = findSecrets(input.criticalReadSignature);
    if (secrets.length > 0) return error(describeSecrets(secrets));
  }

  // Same validation as the web API, so an agent and a browser are held to
  // exactly the same rules.
  const parsed = parseTarget(input);
  if (!parsed.ok) return error(parsed.error);

  const report = await runDiagnosis(parsed.target);
  return { text: formatReport(report), isError: false };
}

export interface ConfigInput {
  config: string;
  expectedChainId?: number;
  criticalReadSignature?: string;
}

export async function diagnoseConfig(input: ConfigInput): Promise<ToolResult> {
  // Refuse before parsing anything: a wallet secret is never read.
  const secrets = findSecrets(input.config);
  if (secrets.length > 0) return error(describeSecrets(secrets));

  const extraction = extractFromText(input.config);
  const rpcUrl = extraction.rpcUrls[0]?.value;
  const expectedChainId = input.expectedChainId ?? extraction.chainId?.value;

  if (!rpcUrl) {
    return error(`${formatExtraction(extraction)}\n\nNo RPC URL found, so nothing was diagnosed. Pass the URL the app connects to.`);
  }
  if (!expectedChainId) {
    return error(
      `${formatExtraction(extraction)}\n\nCould not establish which network the app expects, so nothing was diagnosed. ` +
        'Call again with expectedChainId (for example 84532 for Base Sepolia, 8453 for Base).',
    );
  }

  const result = await diagnoseRpc({
    rpcUrl,
    expectedChainId,
    contractAddress: extraction.contracts[0]?.value,
    fallbackRpcUrl: extraction.rpcUrls[1]?.value,
    criticalReadSignature: input.criticalReadSignature,
  });

  return { text: `${formatExtraction(extraction)}\n\n${result.text}`, isError: result.isError };
}

export async function compareConfigs(input: { before: TargetInput; after: TargetInput }): Promise<ToolResult> {
  const before = parseTarget(input.before, 'before');
  if (!before.ok) return error(before.error);
  const after = parseTarget(input.after, 'after');
  if (!after.ok) return error(after.error);

  // In parallel for the same reason as the web comparison: in series, a
  // network change between the two runs would compare two different moments.
  const [beforeReport, afterReport] = await Promise.all([
    runDiagnosis(before.target),
    runDiagnosis(after.target),
  ]);
  return { text: formatComparison(compareReports(beforeReport, afterReport)), isError: false };
}
