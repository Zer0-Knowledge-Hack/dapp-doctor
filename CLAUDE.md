# DApp Doctor — project rules

Read-only diagnosis of a dApp RPC configuration.
Burning Token · NERDCONF hackathon. Team of 3. Deadline: Sunday
13 September 2026, 23:59 ART.

**This project is written in English** — code, comments, UI strings, commit
messages, docs. Do not mix languages.

**This project uses pnpm.** Never run `npm` or `yarn`, and never `npx`: use
`pnpm`, `pnpm dlx` and the scripts in `package.json`. Mixing package managers
creates a second lockfile and a different dependency tree for whoever installs
next. The pnpm version is pinned in `packageManager`.

> This file holds the **repository** rules and travels with it.
> Machine-local Claude Code session rules live in `C:\Burning token\CLAUDE.md`,
> outside the repo.

---

## 1. Engine invariants

These four rules are why the diagnosis can be trusted. If one breaks, the
product loses its value even if it still compiles. **Do not change them
without discussing it with the team.**

1. **`NOT_TESTED` never counts as passing.** Not having been able to test
   something is not evidence that it works. In `aggregateStatus` it counts as
   risk. If you ever see a `READY` with a `NOT_TESTED` inside it, that is a bug.

2. **Never infer what was not observed.** When a check cannot run, it reports
   `NOT_TESTED` with the reason. A result is never deduced from another check.

3. **Corrective actions are deterministic.** The table in
   `checks/helpers.ts` maps failure → action without calling any model.
   Nebius sits *on top of* this, never *instead of* it: if the AI goes down or
   hallucinates, the diagnosis has to keep working.

4. **Read-only, always.** The engine uses `eth_call`, `eth_getCode`,
   `eth_chainId`, `eth_blockNumber` and `eth_getBlockByNumber`. Nothing else.
   No private keys, no seed phrases, no signing, no sending transactions.
   Do not add a dependency that asks for a private key.

Derived rule: **a wrong chain ID does not stop the chain.** Running bytecode
and critical read anyway is what produces the evidence of the failure. See the
comment in `engine.ts`.

## 2. Secrets

- Keys go in `.env.local`, covered by `.env*` in `.gitignore`.
- Every new variable is declared empty in `.env.example` in the same commit.
- **The repo is public.** A key that reaches a commit must be rotated:
  deleting the commit is not enough, it is indexed within seconds.
- Before sending anything to Linkup or Nebius, pass it through `redactRpcUrl`
  or an equivalent. RPC providers put the API key in the path or the query
  string, and the report is public.

## 3. Branches and PRs

`main` is protected: no direct pushes, no force-pushes.

```
branch:  <name>/<what-it-does>       e.g. will/nebius-eval
commit:  imperative, in English, explaining the why rather than the what
PR:      merge it yourself, no approval needed
```

Nobody has to review you before you merge. The PR does have to exist: that is
what stops three people from stepping on `main` at once.

**For agents (Claude Code):** do not `git push` or open PRs unless explicitly
asked at that moment. Committing locally is fine. Publishing is the person's
call, and one authorisation does not carry over to the next time.

## 4. Before merging

```bash
pnpm verify   # typecheck + build + smoke, in that order
```

All three stages must pass. The smoke test hits real public RPCs, so it can fail
because a provider is down rather than because of your code — if it fails,
look at which scenario before assuming you broke something.

## 5. Track ownership

Each sponsor track is **binary eligibility**: without the complete
integration, the project is out of that track. That is why it is three
complete tracks and not six half-done ones, and why nobody touches someone
else's track.

| Track | Module | Hard requirement |
|---|---|---|
| Nebius (Applied AI) | AI diagnosis + 8 evaluation cases | concrete task, cases, metrics, limits shown |
| Linkup (Deep Research) | 1–2 provider error categories | research, verify the source, and **use** the finding |
| Render (Workflows) | 5–6 task pipeline | state, failure, retry and recovery demonstrable |

The deterministic engine is closed. The three integrations are separable
modules: if you are editing `src/lib/diagnostics/`, you have probably stepped
into someone else's path.

## 6. Honesty in the demo

The submission checklist requires it and the jury scores it:

- Anything simulated or staged for the demo is declared as such.
- Declare which AI was used and which components existed before
  5 September 2026.
- The README does not announce integrations that do not work yet. If Nebius
  is not integrated, the README says it is not integrated.

## 7. Hackathon data

Never answer from memory about the hackathon, the submission or the projects:
the data changes live. Always call the `burning-token` MCP tools
(`ask_hackathon` for any question about the event, `get_my_status`,
`get_my_projects`, `get_my_submission`).

The submission is **not** sent from the MCP: it is completed in the project
form at app.burningtoken.dev.
