# DApp Doctor

Read-only diagnosis of a dApp RPC configuration. Finds the failure, says what
to do about it, and proves the fix worked.

Built for the **Burning Token · NERDCONF** hackathon (September 2026).

---

## Status

The deterministic engine is finished and verified against Base Mainnet and
Base Sepolia live. The sponsor integrations are not in yet.

| Component | Status |
|---|---|
| Six-check engine | ✅ working |
| Aggregated status and report | ✅ working |
| Before/after comparison | ✅ working |
| Public deployment | ⛔ pending |
| Demo contract on Base Sepolia | ⛔ pending |
| Nebius — Applied AI | ⛔ pending |
| Linkup — Deep Research | ⛔ pending |
| Render — Workflows | ⛔ pending |

This README is updated as each piece lands. It does not announce anything that
does not work yet.

## The problem

A misconfigured dApp almost never fails with an error. It keeps working and
lies: the node answers, the interface loads, and the data it shows comes from
the wrong network, a lagging node, or an address where no contract exists. The
symptom is not an exception, it is a zero where a balance should be.

DApp Doctor runs six deterministic checks against that configuration and
returns a status with a concrete action per finding.

## The six checks

| # | Check | What it catches |
|---|---|---|
| 1 | RPC access | The URL does not answer, or answers with something that is not a node. Distinguishes network failure, timeout, HTTP and JSON-RPC error. |
| 2 | Network identity | The node is on a different network than the application expects. |
| 3 | Node freshness | The node is lagging and serves stale state without raising an error. |
| 4 | Contract bytecode | No contract is deployed at that address on that network. |
| 5 | Critical read | The contract exists but is not the one the application believes: the function is missing, or the ABI does not match. |
| 6 | Fallback RPC | The backup does not answer, or is on a different network — which is worse, because the day the primary goes down the app will silently read from the wrong chain. |

All of them use only `eth_call`, `eth_getCode`, `eth_chainId`,
`eth_blockNumber` and `eth_getBlockByNumber`. **No private keys, no seed
phrases, no transactions.**

## The statuses

| Status | Meaning |
|---|---|
| `READY` | All six passed. |
| `AT_RISK` | Nothing critical fails, but there are warnings or untested checks. |
| `BLOCKED` | A critical check fails. The headline names the root cause. |
| `NOT_TESTED` | No check could be executed. |

**`NOT_TESTED` counts as risk, never as passing.** Not having tested something
is not evidence that it works.

## Before and after

A single report proves nothing. `/compare` runs two diagnoses in parallel —
the broken configuration and the fixed one — and shows the delta per check:

```
BLOCKED  ->  READY     2 fixed · 0 regressed

RPC access             PASS        -> PASS        unchanged
Network identity       FAIL        -> PASS        FIXED
Node freshness         PASS        -> PASS        unchanged
Contract bytecode      PASS        -> PASS        unchanged
Critical read          PASS        -> PASS        unchanged
Fallback RPC           NOT_TESTED  -> PASS        FIXED
```

Both run in parallel on purpose: run in series, if network state changed
between one and the other, the "before/after" would be comparing two different
moments. The verdict names the regression first when there is one — having
fixed four things does not make up for breaking one that used to pass.

## Running it

This project uses **pnpm**. Do not use npm or yarn: the lockfile is
`pnpm-lock.yaml`, and mixing package managers produces a second lockfile and a
different dependency tree for whoever runs it.

```bash
pnpm install
pnpm dev             # http://localhost:3000
```

Full verification:

```bash
pnpm verify          # typecheck + build + smoke
```

Or one at a time: `pnpm typecheck`, `pnpm build`, `pnpm smoke`.

The smoke test hits real public RPCs, so it can fail because a provider is
down rather than because of the code.

## API

```bash
curl -X POST http://localhost:3000/api/diagnose \
  -H "content-type: application/json" \
  -d '{
    "rpcUrl": "https://mainnet.base.org",
    "expectedChainId": 84532,
    "contractAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "criticalReadSignature": "symbol() returns (string)"
  }'
```

`POST /api/compare` takes `{ "before": {...}, "after": {...} }` with the same
shape and returns the delta.

## Architecture

```
src/lib/diagnostics/
  types.ts        data model
  rpc.ts          JSON-RPC client + API key redaction in URLs
  networks.ts     known networks, so they can be named instead of numbered
  engine.ts       orchestration, gating and status aggregation
  compare.ts      delta between two diagnoses
  parseTarget.ts  validation shared by both routes
  checks/         one check per file
```

The engine deliberately avoids viem's transport: it needs to tell a network
failure apart from a provider 429 and from a JSON-RPC error, because each
leads to a different action. viem is used to encode and decode the critical
read.

Corrective actions are a **deterministic table**, not a model call. The Nebius
AI sits on top of this, not instead of it: if it goes down or hallucinates,
the diagnosis keeps working.

## Tracks

| Track | How it is covered | Status |
|---|---|---|
| **Nebius — Applied AI** | RPC failure diagnosis as a concrete task, 8 cases with known causes, metrics for classification, action and non-invention. | ⛔ pending |
| **Linkup — Deep Research** | Search of official documentation for a provider error, and the derived action applied to the report. | ⛔ pending |
| **Render — Workflows** | 5–6 task pipeline with an injected failure, retry and recovery without duplicating findings. | ⛔ pending |

## AI and prior components disclosure

- **AI used to build the project:** Claude Code (Claude Opus 5), for the
  design and implementation of the diagnostic engine, the API and the UI.
- **Components predating 5 September 2026:** none. The repository was started
  on 9 September 2026. The only earlier document is the work plan (`docs/`),
  written on 8 September.
- **Third-party dependencies:** Next.js, React, viem and Tailwind, all public
  and declared in `package.json`.

<!-- TODO team: confirm this section before submitting. -->

## Team

- (to be filled in)
- (to be filled in)
- (to be filled in)

## License

MIT. See [LICENSE](LICENSE).
