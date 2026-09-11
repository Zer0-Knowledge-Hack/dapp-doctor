import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { compareConfigs, diagnoseConfig, diagnoseRpc } from '@/lib/mcp/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A comparison runs two full diagnoses in parallel against live networks.
export const maxDuration = 30;

/**
 * DApp Doctor as an MCP server, for agents such as Claude Code or Cursor.
 *
 * The agent reads the developer's project, finds the RPC configuration, and
 * calls these tools. No form to fill in. Every tool is read-only and goes
 * through the same engine and SSRF guard as the web app.
 */

const address = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'A 20-byte EVM address: 0x followed by 40 hex characters.');

const target = z.object({
  rpcUrl: z.string().min(1).describe('The RPC URL the app connects to, exactly as configured.'),
  expectedChainId: z
    .number()
    .int()
    .positive()
    .describe('The chain id the app expects, e.g. 84532 for Base Sepolia, 8453 for Base, 1 for Ethereum.'),
  contractAddress: address.optional().describe('A contract the app reads, if any.'),
  criticalReadSignature: z
    .string()
    .max(200)
    .optional()
    .describe('A zero-argument view function the app calls, e.g. "totalSupply() returns (uint256)".'),
  fallbackRpcUrl: z.string().min(1).optional().describe('The backup RPC URL, if the app has one.'),
});

// Tells the agent this tool only reads and never changes anything.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const WHERE_TO_LOOK =
  'Look in the project for: .env, .env.local or .env.example; the wagmi or viem config; hardhat.config.*; ' +
  'foundry.toml. Take the RPC URL, the chain id or chain the app uses (baseSepolia means 84532), and optionally ' +
  'a contract address it reads. Never send private keys, seed phrases or other secrets: none are needed, and ' +
  'requests containing them are refused.';

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'diagnose_rpc',
      {
        title: 'Diagnose an RPC configuration',
        description:
          'Runs six read-only checks on a dApp RPC configuration: RPC access, network identity, node freshness, ' +
          'contract bytecode, a critical contract read, and the fallback RPC. Returns READY, AT_RISK or BLOCKED, ' +
          `the root cause, and what to do for each failing check. ${WHERE_TO_LOOK}`,
        inputSchema: target,
        annotations: READ_ONLY,
      },
      async (args) => {
        const result = await diagnoseRpc(args);
        return { content: [{ type: 'text', text: result.text }], isError: result.isError };
      },
    );

    server.registerTool(
      'diagnose_config',
      {
        title: 'Diagnose from configuration text',
        description:
          'Same diagnosis as diagnose_rpc, but DApp Doctor reads the values itself from configuration text: an RPC ' +
          'URL, .env lines, or a wagmi, viem or hardhat config. Send only the lines that set RPC URLs, chain ids ' +
          'and contract addresses. Text containing a private key or seed phrase is refused without being processed.',
        inputSchema: z.object({
          config: z.string().min(1).max(20_000).describe('The configuration text to read.'),
          expectedChainId: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Overrides the chain read from the text, if it is wrong or missing.'),
          criticalReadSignature: z.string().max(200).optional().describe('A zero-argument view function to call.'),
        }),
        annotations: READ_ONLY,
      },
      async (args) => {
        const result = await diagnoseConfig(args);
        return { content: [{ type: 'text', text: result.text }], isError: result.isError };
      },
    );

    server.registerTool(
      'compare_configs',
      {
        title: 'Prove a fix',
        description:
          'Diagnoses a configuration before and after a change, side by side, and reports which checks the change ' +
          'fixed and which it broke. Use it after changing a config, to prove the fix instead of assuming it.',
        inputSchema: z.object({
          before: target.describe('The configuration before the change.'),
          after: target.describe('The configuration after the change.'),
        }),
        annotations: READ_ONLY,
      },
      async (args) => {
        const result = await compareConfigs(args);
        return { content: [{ type: 'text', text: result.text }], isError: result.isError };
      },
    );

    server.registerPrompt(
      'check_my_dapp',
      {
        title: 'Check my dApp',
        description: "Find this project's RPC configuration and diagnose it with DApp Doctor.",
      },
      () => ({
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                "Diagnose this project's blockchain RPC configuration with DApp Doctor.",
                '',
                `1. ${WHERE_TO_LOOK}`,
                '2. Call diagnose_rpc with those values. If the app has several networks, diagnose the one it uses by default.',
                '3. Explain the verdict in plain words and propose the smallest fix for anything that failed.',
                '4. If I apply the fix, call compare_configs with the old and new values to prove it worked.',
                '',
                'Do not read or send private keys, seed phrases or API secrets beyond the RPC URL itself.',
              ].join('\n'),
            },
          },
        ],
      }),
    );
  },
  {
    serverInfo: { name: 'dapp-doctor', version: '1.0.0' },
    // Tool arguments carry RPC URLs, which often embed API keys. Never log them.
    verboseLogs: false,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
