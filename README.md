# DApp Doctor

Read-only diagnosis of a dApp RPC configuration. Finds the failure, says what
to do about it, and proves the fix worked.

Built for the **Burning Token** hackathon by NERDCONF (September 2026).

**Live:** https://dapp-doctor.vercel.app

---

## Status

| Component | Status |
|---|---|
| Six-check engine, verified against Base Mainnet and Base Sepolia | ✅ live |
| Aggregated verdict and report | ✅ live |
| Before/after comparison (`/compare`) | ✅ live |
| Public deployment | ✅ live |
| DApp Doctor Pro: diagnosis history, sold with RevenueCat | ✅ live (Test Store purchases) |
| Launch Check (`/launch`): the stricter bar before mainnet, a Pro feature | ✅ live |
| RPC Heartbeat (`/heartbeat`): listen to a chain's pulse | ✅ live |
| Spanish interface (English \| Español buttons in the header) | ✅ live |
| Optional Google sign-in, so Pro and history follow you to any device | ✅ built; on once its credentials are set |
| MCP server for agents (`/api/mcp`) | ✅ live |
| Config reader (paste a `.env` or config) | 🟡 built and tested; not yet in the web UI |
| Nebius — AI root-cause analysis | ✖ not entered: the credits could not be redeemed from our country |

This README is updated as each piece lands. It does not announce anything that
does not work yet.

## The problem

A misconfigured dApp almost never fails with an error. It keeps working and
lies: the node answers, the interface loads, and the data it shows comes from
the wrong network, a lagging node, or an address where no contract exists. The
symptom is not an exception, it is a zero where a balance should be.

DApp Doctor runs six deterministic checks against that configuration and
returns a verdict with a concrete action per finding.

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

## The verdicts

| Verdict | Meaning |
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
BLOCKED  ->  READY     2 fixed, 0 regressed

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

## Use it from your agent (MCP)

DApp Doctor is also an MCP server, so an agent can read your project and run
the diagnosis without you filling in anything:

```bash
claude mcp add --transport http dapp-doctor https://dapp-doctor.vercel.app/api/mcp
```

Then ask your agent to check the project's RPC configuration with DApp Doctor,
or use the `check_my_dapp` prompt.

| Tool | What it does |
|---|---|
| `diagnose_rpc` | Runs the six checks on values the agent read from the project |
| `diagnose_config` | Reads the values itself from configuration text: a URL, `.env` lines, a wagmi or hardhat config |
| `compare_configs` | Diagnoses a configuration before and after a change, to prove the fix |

Every tool is read-only and marked so. Text containing a private key, a seed
phrase or a variable named like one is **refused before it is read**, and the
refusal never repeats the value.

## DApp Doctor Pro

Diagnosis and comparison are free. Pro is for teams taking a dApp to mainnet:

- **Launch Check** (`/launch`) holds a configuration to the bar a launch needs.
- **Diagnosis history** keeps every diagnosis you run, so you can see when a
  configuration broke and prove when it was fixed.

- Sold through **RevenueCat** (web SDK). During the hackathon all purchases are
  **Test Store** transactions: no card is charged.
- Access is verified **on the server** against RevenueCat on every paid
  request. A browser-only check could be skipped from the devtools.
- If RevenueCat cannot be reached, access is refused with the reason rather
  than granted on a guess.
- A cancelled purchase, a failed one and an expired entitlement each have their
  own message. The history is kept after access expires.

### Accounts

Signing in is optional; nothing free needs it.

- **Without an account**, the browser keeps a random id, and a purchase and
  the history belong to it. Another device, or clearing site data, loses them.
- **With Google sign-in**, the id comes from the account, so a purchase and the
  history follow the person to any device. The id is a hash of the Google
  account id, so it reveals nothing about the account.
- Only the basic scopes (openid, email, profile) are requested. Sessions are
  signed cookies, with no database and no Google token kept.
- An account id is honoured only with that account's session: knowing it is
  not enough to read someone's history.
- A purchase made before signing in stays with that browser. The Pro page says
  so before anyone buys.

### Launch Check

The free diagnosis asks "does this configuration work?". Launch Check asks "is
it ready for real users?". It runs the six checks with a tighter freshness
limit (15 s on Base, three slots on Ethereum), then applies six launch rules:

| Rule | If it fails |
|---|---|
| The expected chain is a known mainnet | Blocks on a testnet; warns on a chain DApp Doctor does not know |
| Every RPC uses HTTPS | Blocks |
| A fallback RPC is configured and answers on the right network | Blocks |
| The fallback comes from a different provider | Warns |
| The primary is not a known shared public endpoint | Warns |
| A contract and a critical read are declared | Blocks |

A shared public endpoint as the primary is a warning, not a block: nothing says
it cannot serve production. For Base's own public endpoints the report quotes
what [Base's documentation](https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_subscribe)
states — HTTP only, no WebSocket connections — and nothing it does not.

The rules are a fixed table, like the checks. A rule that cannot be evaluated
is `NOT_TESTED`, and counts as risk.

## RPC Heartbeat

`/heartbeat` puts a stethoscope on a blockchain:
- **Every beat is a new block.** Nothing else makes the trace spike.
- **The spike's height is how many transactions the block carried.**
- **The beep's pitch is how full the block was.**
- **An RPC that stops answering goes flatline**, with the long tone, and a
  defibrillator you can try. Three failed shocks and the monitor calls the time
  of death.
- **A node that answers while its chain stops moving is in a coma.**

The heart rate is blocks per minute, from the chain's own block numbers and
timestamps: Base beats about 30, Ethereum about 5.

It runs entirely in the browser:
- The page reads the RPC directly with `eth_chainId` and `eth_getBlockByNumber`,
  so a pasted URL, and any key in it, never reaches our servers.
- A hidden tab stops asking.
- The "dead RPC" patient uses an `.invalid` address, which never resolves, so
  its flatline is real rather than staged.

## Brand

The logo and the mascot are separate:

| File (`public/brand`) | What it is |
|---|---|
| `dapp-doctor-mark.svg` | The mark: a medical cross carrying four connected nodes and a hub, the RPC network being diagnosed |
| `dapp-doctor-logo-horizontal.svg` | Mark and wordmark. The wordmark sits on its own white label, so it reads on white, black or transparent backgrounds |
| `dapp-doctor-logo-monochrome.svg` | All black, for one-colour use on light backgrounds |
| `favicon.svg`, `favicon-32.png` | The mark simplified for 16 px: cross and hub, no network |
| `apple-touch-icon.png` | The full mark, for the iOS home screen |
| `icon-512.png`, `icon-maskable-512.png` | The installed app's icons (web manifest). The maskable one fills the square blue so launchers can crop it |
| `dapp-doctor-mascot.png` | The otter, a companion character. It is never part of the logo |

- The wordmark files embed Big Shoulders (SIL Open Font License), so they keep
  their face when opened on their own. `scripts/brand-assets.mts` writes them
  after a build.
- The mascot is the original drawing, unchanged. The source file had its
  transparency painted in as a grey checkerboard; that background was removed
  and nothing else was altered.

## In Spanish

The header's **English | Español** buttons switch the whole interface,
reports included. The choice is kept in a cookie, so the server renders the
chosen language on the first paint.

The engine, the API and the MCP server stay in English: they are the source of
truth, and the Spanish report is a presentation of the same English report,
applied after the verdict is made, so a translation can never change a
verdict. `pnpm i18n` proves every sentence the engine writes has a Spanish
rendering.

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
pnpm verify
```

It runs, in order: `typecheck`, `build`, `ssrf` (the guard), `billing`
(entitlement rules), `intake` (the config reader), `mcp` (the agent tools and
secret refusal), `launch` (the Launch Check rule table), `heartbeat` (the
monitor's vital signs), `i18n` (every engine sentence in Spanish) and `smoke` (five scenarios against Base, live). The smoke test
hits real public RPCs, so it can fail because a provider is down rather than
because of the code.

Environment variables are listed, empty, in `.env.example`. Without them the
diagnosis still works; Pro and history simply report that they are not enabled.

## API

```bash
curl -X POST https://dapp-doctor.vercel.app/api/diagnose \
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

`POST /api/launch-check` takes the same shape and requires Pro: the user id goes
in the `x-dapp-doctor-user` header, and the server checks the entitlement with
RevenueCat before any request leaves for the network. Without access it answers
`402` with the reason.

## Security model

The API takes a URL from an untrusted caller and fetches it server-side, which
makes it an SSRF primitive by construction. Three controls keep that contained,
in `ssrfGuard.ts` and `rpc.ts`:

1. **Every resolved address is checked**, not just the first. Loopback,
   link-local (`169.254.169.254`, where cloud metadata lives), private ranges,
   CGNAT, multicast and the rest of reserved space are refused before a socket
   is opened. IPv4-mapped, NAT64 and 6to4 forms are decoded and checked as the
   IPv4 destination they actually carry.
2. **The connection is pinned to the addresses that were validated.** Without
   this, a hostname can answer with a public address during the check and a
   private one when the socket opens — DNS rebinding.
3. **Redirects are never followed.** `rpc.ts` uses `node:http`, not `fetch`,
   partly for this: a redirect is the standard way around a host check.

The same engine serves the web app and the MCP server, so agents are held to
exactly the same guard as browsers.

Keeping secrets out of everything we store or return:

- Third-party response content is bounded and validated before entering a
  report: capped responses, control characters stripped, and `eth_blockNumber`
  output must be a hex quantity to be shown.
- RPC URLs are redacted in reports, agent output and stored history, since
  providers put API keys in the path or query string.
- The history user id travels in a request header, never a URL, because URLs
  end up in logs, browser history and Referer headers.
- Server-only keys never reach the browser bundle; only the RevenueCat public
  key does, by design.

`pnpm ssrf` and `pnpm mcp` assert all of this.

## Architecture

```
src/
  app/
    page.tsx              the landing page
    diagnose/             the diagnosis tool (?demo=broken runs the demo on arrival)
    compare/              before/after
    history/              DApp Doctor Pro: plans and saved diagnoses
    launch/               Launch Check (Pro)
    heartbeat/            RPC Heartbeat, read from the browser
    api/diagnose          one diagnosis
    api/compare           two diagnoses and their delta
    api/history           a paying user's saved diagnoses
    api/launch-check      a Launch Check, for an entitled user
    api/mcp               the MCP server for agents
  components/
    landing/              landing sections; copy and LIVE flags in content.ts
    app/                  the tool pages' shell, fields, notices and report
    ui/, ecg/             shared stamp, sheet, button and ECG strip
  lib/
    diagnostics/          the engine: checks, gating, verdicts, SSRF guard
    launch/               Launch Check rules on top of the engine
    heartbeat/            vital signs from a block, and the browser-side RPC reads
    i18n/                 the interface language and the engine's sentences in Spanish
    intake/extract.ts     reads RPC URL, chain and contract from any config text
    billing/              RevenueCat: browser purchase flow, server entitlements
    history/store.ts      Upstash Redis storage, redacted before writing
    mcp/                  agent tools, secret refusal, agent-facing output
    ai/                   Nebius Token Factory client (not entered, not wired in)
```

The engine deliberately avoids viem's transport: it needs to tell a network
failure apart from a provider 429 and from a JSON-RPC error, because each
leads to a different action. viem is used to encode and decode the critical
read.

Corrective actions are a **deterministic table**, not a model call. No model
decides whether a check passed.

## Challenges

| Challenge | How it is covered | Status |
|---|---|---|
| **Subscriptions — RevenueCat** | DApp Doctor Pro: offering with monthly, yearly and lifetime plans, the `daap_doctor_pro` entitlement gating Launch Check and diagnosis history, verified server-side. Handles successful, cancelled and failed purchases and expired access. | ✅ live, Test Store |
| **Fun Build — NERDCONF** | RPC Heartbeat: a chain's blocks as a heartbeat you can hear, a real flatline when an RPC dies, and a defibrillator. No sponsor technology. | ✅ live |
| **Applied AI — Nebius** | Not entered: the Token Factory credits could not be redeemed from our country. | ✖ not entered |

Deep Research (Linkup), Multiplayer (Convex) and Workflows (Render) are not
being entered.

## AI and prior components disclosure

- **AI used to build the project:** Claude Code (Claude Opus 5), for the
  design and implementation of the diagnostic engine, the API, the MCP server
  and the UI.
- **Components predating 5 September 2026:** none. The repository was started
  on 9 September 2026. The only earlier document is the work plan (`docs/`),
  written on 8 September.
- **Third-party dependencies:** Next.js, React, viem, Tailwind, the RevenueCat
  web SDK, the Upstash Redis client, the MCP SDK and zod, all public and
  declared in `package.json`.

<!-- TODO team: confirm this section before submitting. -->

## Team

- (to be filled in)
- (to be filled in)
- (to be filled in)

## License

MIT. See [LICENSE](LICENSE).
