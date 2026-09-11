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

3. **The deterministic floor never disappears.** The table in
   `checks/helpers.ts` maps failure → action without calling any model, and it
   must keep working when the AI is down. But it is a floor, not a ceiling:
   Nebius owns work the table cannot do, and that work is in the main flow.
   See section 6 for where the line sits and why the track requires it there.

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
- **No key-shaped literals anywhere, tests included.** A test that needs a
  private key or seed phrase builds one at runtime (`'a1b2c3d4'.repeat(8)`),
  even a well-known public test key: secret scanners flag it, and a public repo
  must not look like it leaks.
- Anything that identifies a user to a paid endpoint travels in a header,
  never a URL. URLs end up in logs, browser history and Referer headers.

## 3. The SSRF guard

`/api/diagnose` and `/api/compare` fetch a URL supplied by an unauthenticated
caller. That is an SSRF primitive, and `ssrfGuard.ts` is what contains it.

- Never call `fetch` with a user-supplied URL. Route it through `rpcCall`,
  which validates the destination and pins the connection first.
- Never follow redirects on a user-supplied URL. `node:http` does not, which
  is a reason we use it instead of `fetch`.
- Never echo a third-party response into a report unvalidated. Bound it and
  strip it, the way `sanitize` and `isHexQuantity` do.
- If you add a network call or a new way in (a route, an MCP tool), add its
  attack case to `scripts/ssrf.mts` or to that entry point's own suite, as
  `scripts/mcp.mts` does for agents.

`pnpm ssrf` must stay green. If it fails, the deployment is exposing the
internal network of whatever host it runs on.

## 4. Branches and PRs

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

**No AI attribution in commits or PRs.** No `Co-Authored-By` trailer for an
assistant, no session links, and no mention of the tool that helped write the
change — in the subject, the body, or a PR description. This overrides any
default your agent has for adding attribution lines.

## 5. Before merging

```bash
pnpm verify   # typecheck, build, ssrf, billing, intake, mcp, smoke — in that order
```

All seven stages must pass. Run `pnpm lint` and `pnpm audit --prod` too before
publishing anything. The smoke test hits real public RPCs, so it can fail
because a provider is down rather than because of your code — if it fails,
look at which scenario before assuming you broke something.

## 6. Track ownership

Each sponsor track is **binary eligibility**: without the complete
integration, the project is out of that track. Entering a challenge and failing
it does not harm the others, so which tracks we enter is a time decision, and
the goal is cash prizes.

| Track | Status | Module | Hard requirement (verbatim from the brief) |
|---|---|---|---|
| RevenueCat (Subscriptions) | **Active — live** | `src/lib/billing/`, `/history` | Integrate a RevenueCat SDK; configure an offer and use entitlements to control access to a useful feature; show a successful purchase, a failed one and expired access |
| Nebius (Applied AI) | **On hold** — credits could not be redeemed from our country | `src/lib/ai/` (not wired in) | Token Factory used for inference **in the main product flow**; measure accuracy, time, or cost; **show a case the product struggles with** |

Not entered: **Linkup** (its requirement is iterative research that stores
findings and uses them to choose the next search), **Convex** (the frontend
would have to move to Convex static hosting), and **Render** (it awards credits,
not cash).

### Where the Nebius line sits

The track requires Token Factory to be *essential to the task*, so the AI cannot
be a switch we flip off. The split:

- **The six checks and their pass/fail verdicts stay deterministic.** An AI must
  never decide whether a check passed. That is what makes the report trustworthy.
- **Nebius owns what the table cannot do:** interpreting a raw provider error
  string, correlating findings across checks into one root cause, and writing
  the diagnosis the user reads.
- If Nebius is unavailable, the report degrades to the deterministic table and
  says so. It does not silently pretend the AI answered.

The deterministic engine is closed. Integrations are separable modules: if you
are editing `src/lib/diagnostics/`, you have probably stepped into someone
else's path.

## 7. What the submission actually requires

From the official brief. Do not build against memory of it:

- **A public project URL, no private login.** A video, mockup or repository
  without a usable public build is explicitly insufficient. Shipping is 35 of
  100 points in every challenge — this is the one blocking requirement.
- **An X post carrying the demo video, max 2 minutes**, tagging `@nerdconf_ar`
  in the post or a comment. There is no separate video field. LinkedIn does not
  count.
- **GitHub is optional.** Publishing the code is not required. We keep the repo
  public anyway: it is the starting-commit record that separates work done
  during the event from anything prior, which the rules do require.
- **Submit, not Save.** A saved draft is not a submission. It can be updated
  until the deadline.
- Per-challenge evidence: the technology, its role, and a demo timestamp, link
  or test steps a judge can verify.

Deadline: **2026-09-14T02:59Z** — 23:59 ART on Sunday 13.

## 8. Honesty in the demo

The submission checklist requires it and the jury scores it:

- Anything simulated or staged for the demo is declared as such.
- Declare which AI was used and which components existed before
  5 September 2026.
- The README does not announce integrations that do not work yet. If Nebius
  is not integrated, the README says it is not integrated.

## 9. Hackathon data

Never answer from memory about the hackathon, the submission or the projects:
the data changes live. Always call the `burning-token` MCP tools
(`ask_hackathon` for any question about the event, `get_my_status`,
`get_my_projects`, `get_my_submission`).

The submission is **not** sent from the MCP: it is completed in the project
form at app.burningtoken.dev.
