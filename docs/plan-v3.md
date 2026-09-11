# DApp Doctor — Work plan v3

**Supersedes `plan-de-trabajo-v2.md`.** That plan was written for a solo
developer chasing three tracks, before the official briefs were read. Both
premises turned out wrong.

Written 2026-09-10. Deadline **2026-09-14T02:59Z** (23:59 ART, Sunday 13).

## Status on 11 September

The day-by-day section below is the original plan; reality moved. Read this
first.

| Item | Status |
|---|---|
| Public deployment, project created on the platform | ✅ done Thursday |
| RevenueCat: offering, `daap_doctor_pro` entitlement, server-side checks, history | ✅ live, moved ahead of Nebius |
| MCP server for agents | ✅ built; added after the plan was written |
| Config reader (paste a `.env` or config) | 🟡 built and tested, not yet in the web UI |
| Landing page | 🟡 being built from `docs/landing-brief.md` |
| **Nebius** | ⏸ **on hold**: the Token Factory credits could not be redeemed from our country. Worth asking the organizers at hey@nerdconf.com for another route |
| RevenueCat end-to-end test with a real Test Store purchase | ⏳ pending, needs a browser |
| Demo video, X post, Submit | ⏳ Sunday |

---

## What changed from v2

| v2 assumed | Reality from the official brief | Consequence |
|---|---|---|
| Pick 3 tracks; entering more is risky | *"Your project may enter any number of the six challenges"* and *"if an entry does not qualify for one challenge, it can still compete in the others"* | There is no penalty for trying. Track count is a time decision only. |
| Render is a core track | Render awards **credits, not cash** | Deprioritised. It is also the only track with 3 placements, so it is the easiest to place in — but it is not money. |
| Linkup = one search against official docs | *"must store findings and use them to decide what to investigate next"* + follow-up searches | The planned scope does not meet the entry requirement. Dropped. |
| GitHub repo needed | *"Publishing your code or granting repository access is not required"* | Optional. We keep it public as the starting-commit record the rules do require. |
| Deadline Sunday 13 23:59 ART | Confirmed by the platform | Unchanged. |

## Targets

**Two tracks, USD 1,000 cash potential.**

| Track | Prize | Why this one |
|---|---|---|
| Applied AI · Nebius | USD 500 cash | The product was conceived for it. Engine and evaluation cases already exist. |
| Subscriptions · RevenueCat | USD 500 cash | Bolt-on paywall layer. Touches no engine file, so it parallelises without conflicts. |

Not being entered: **Linkup** (iterative research is beyond need), **Convex**
(requires re-architecting onto `convex.site` static hosting; our API routes run
Node for the SSRF guard), **Fun Build** (this product is not playful; it would
only work as a separate second project), **Render** (credits, not cash — revisit
only if everything else is done).

## The one thing that blocks everything

Shipping is **35 of 100 points in every challenge**, and the rule is explicit:
*"A video, mockup, or repository without a usable public build is
insufficient."*

Until there is a public URL, every track scores zero. Nothing else on this plan
matters more.

---

## Day by day

### Thursday 10 — ship something public

- [ ] Create the project at https://app.burningtoken.dev/dashboard/projects
- [ ] `pnpm dlx vercel login`, then deploy to production
- [ ] Confirm a stranger can open the URL, run a diagnosis, and see a result
- [ ] Put the URL in the platform form and save the draft

**Deliverable:** a public URL that works. From this point the project is
shippable at any moment, and everything after is upside.

### Friday 11 — Nebius

- [ ] Redeem the USD 25 Token Factory credits and create the API key
- [ ] Server-side client (the API is OpenAI-compatible, so the SDK is trivial)
- [ ] Wire it into the main flow — see the design below
- [ ] Degrade to the deterministic report when the model is unavailable, and
      say so on screen rather than pretending

**Deliverable:** a diagnosis whose root-cause explanation comes from Token
Factory, on the public URL.

### Saturday 12 — evaluation + RevenueCat

- [ ] Evaluation set: cases with known causes, measuring accuracy, latency and
      cost per task
- [ ] **A case the product struggles with** — the brief requires showing one
- [ ] Public evaluation results page, no login
- [ ] RevenueCat: Test Store, product, entitlement, offering
- [ ] Test a successful purchase, a failed one, and expired access

**Deliverable:** both integrations working, evaluation published.

### Sunday 13 — submit early

- [ ] Record the demo, max 2 minutes, with a timestamp per track
- [ ] Post on X tagging **@nerdconf_ar**, video included
- [ ] Fill every field and press **Submit** — a saved draft is not a submission
- [ ] Keep the build live through judging

Submit by midday. The deadline is 23:59 ART; nothing should be discovered at
23:00.

---

## Nebius design — where the line sits

The entry requirement is *"use Nebius Token Factory for inference **in the main
product flow**"*, and Integration asks *"is Token Factory **essential to the
task**?"*. An AI layer that can be switched off without the product changing
does not satisfy that.

The split that satisfies both the track and our own invariants:

**Stays deterministic — the AI never touches this:**
- Whether each of the six checks passed. A model must never decide a verdict.
- The aggregated `READY / AT_RISK / BLOCKED / NOT_TESTED` status.
- The known-failure action table in `checks/helpers.ts`.

**Token Factory owns, in the main flow:**
1. **Interpreting raw provider error strings.** The table covers known shapes
   (429, `-32601`). Providers return arbitrary prose the table cannot map.
2. **Correlating the six findings into one root cause.** Today `buildHeadline`
   just picks the first critical failure. Several failures usually share one
   upstream cause, and stating it is the actual product value.

**When Token Factory is unavailable**, the report falls back to the
deterministic table and says on screen that the AI explanation is missing. It
never silently pretends the model answered.

### Metrics

The brief requires at least one of accuracy, time, or cost. All three are cheap
here, so measure all three:

- **Accuracy** — on cases with a known cause, does it name the right root cause?
- **Non-invention** — does it avoid asserting findings the six checks did not
  observe? This is the metric that matters most for a diagnostic tool.
- **Latency and cost per diagnosis** — logged per call.

## RevenueCat design

Test Store is accepted: no real store setup, no real revenue.

- **Free:** run a diagnosis, see the full report **including the AI root cause**.
- **Paid:** saved diagnosis history, before/after comparison across saved runs,
  scheduled re-checks.

> **Do not put the Nebius feature behind the paywall.** If the AI explanation
> is only reachable after a purchase, it is no longer in the main product flow
> for an ordinary user, which puts Nebius eligibility at risk. Paywall
> persistence, not intelligence.

Must be demonstrated: the offer, a successful test purchase granting access, a
**failed** purchase, and **expired** access. Test transactions labelled as such.

## Evidence to write in the submission form

Per track: the technology, what it does in the product, and how a judge
verifies it.

- **Nebius** — Token Factory performs inference in the main diagnosis flow:
  interprets raw provider errors and correlates the six findings into one root
  cause. Verify at the demo timestamp, plus the public evaluation results page
  showing accuracy, latency, cost, and a case it gets wrong.
- **RevenueCat** — SDK with an offering and an entitlement gating diagnosis
  history. Verify at the demo timestamp showing access before and after a Test
  Store purchase, a failed purchase, and expired access.

## Risks

| Risk | Mitigation |
|---|---|
| Thursday ends without a public URL | Everything else stops until it exists. It is worth more than any integration. |
| Two teammates have not started | The plan is executable by one person for both tracks. Anything they add is upside, not dependency. |
| Nebius reads as decorative to a judge | The design above gives the model a task the deterministic table provably cannot do. Say so explicitly in the demo. |
| Nothing recorded until Sunday | Record a short clip each time something works for the first time. |
| Submitted as a draft | Press **Submit**, not Save. It can be updated until the deadline. |

## Official resources

- Nebius credits: https://dev.nebius.com/builders
- Token Factory playground and key: https://tokenfactory.nebius.com
- Token Factory quickstart: https://docs.tokenfactory.nebius.com/quickstart
- Token Factory cookbook: https://github.com/nebius/token-factory-cookbook
- RevenueCat dashboard: https://app.revenuecat.com
- RevenueCat web billing: https://www.revenuecat.com/docs/web/payment-integrations
- RevenueCat Test Store: https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
