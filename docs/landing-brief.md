# DApp Doctor — Landing page brief

Self-contained brief for building the first landing page. Everything needed is
here: the story, final copy for every section, the visual system, the signature
element with reference code, and the claims the page may and may not make.

- **Live app:** https://dapp-doctor.vercel.app
- **Repository:** https://github.com/Zer0-Knowledge-Hack/dapp-doctor
- **Context:** Burning Token hackathon by NERDCONF. Submission closes Sunday
  13 September 2026, 23:59 ART. Target challenge: Subscriptions · RevenueCat.

---

## 0. Rules for whoever builds this

1. **Copy is final.** Use it as written. If something does not fit the layout,
   shorten it rather than rewrite its meaning.
2. **Honesty rule — the most important one.** Every section is tagged
   **LIVE** or **NOT YET**. Publish only LIVE sections. A NOT YET section goes
   in only once the feature works in production. The hackathon judges eligibility
   on what actually works, and the rules forbid presenting simulated results as
   real. A landing page that promises a feature the app does not have is the
   fastest way to lose the jury's trust.
3. **Stack.** Decide before writing code where the landing lives:
   - **Inside the Next.js app** (`src/app/page.tsx` in this repo): one URL, one
     deploy, shared design tokens. Recommended.
   - **As a separate site** (for example Astro): its own deploy, and every call
     to action points at `https://dapp-doctor.vercel.app`. The hackathon form
     takes one public project URL, so decide which one it is.
4. **Project rules apply** (see `CLAUDE.md`): English only, pnpm only — never
   npm, yarn or npx — and no AI attribution in commits.

---

## 1. The product in one breath

**Name:** DApp Doctor

**One-liner:** Finds why your dApp is reading the wrong blockchain data, and
proves the fix worked.

**Who it is for:** developers shipping onchain apps, solo or in a team — the
person debugging why staging shows different numbers than production, or why a
contract call comes back empty.

**The job:** take the RPC configuration an app runs on, check it the way a
doctor examines a patient, and return a verdict with a concrete next step. Then
run the same exam on the fixed configuration and show what changed.

**The insight the whole page is built on:** a misconfigured dApp almost never
fails with an error. It keeps working and lies. The symptom is not an
exception; it is a zero where a balance should be.

---

## 2. Narrative arc

The page tells one story in seven beats. Each section is one beat; do not
reorder them.

| Beat | Section | What the reader should feel or know |
|---|---|---|
| 1. The hook | Hero | "That is my bug." Recognition, not education. |
| 2. The lie, made concrete | Symptoms | The three silent failures, in their own words |
| 3. The exam | Six checks | This is thorough, and it is only reads |
| 4. The verdict | Verdicts | The answer is clear, and it says what to do |
| 5. The proof | Before and after | A fix is proven, not claimed |
| 6. Keep the chart | Pro | Why a team would pay |
| 7. Safe to try | Trust | Nothing to lose by pasting a config |
| — | Final call | Do it now |

The clinic is the metaphor, used with a light hand: the verdict is a rubber
stamp, the status is a heartbeat. The copy itself stays plain — endpoints,
networks, contracts — never "patients" or "symptoms" as jargon a developer has
to translate.

---

## 3. Section by section

### Hero — LIVE

> **Your dApp isn't broken. It's lying.**
>
> The page loads and the node answers, but the balance says zero. DApp Doctor
> finds out why: the wrong network, a lagging node, or a contract that isn't
> there. Get a verdict in seconds.

- **Primary action:** `Diagnose my dApp` → `https://dapp-doctor.vercel.app`
- **Secondary action:** `Watch it catch a broken one` → the app with the broken
  demo already running (`https://dapp-doctor.vercel.app/?demo=broken` — the app
  does not accept this parameter yet; until it does, link to the app root)
- **Visual:** the ECG strip (section 5), full width under the headline, beating
  steadily. This is the one bold element of the page.

### Symptoms — LIVE

> **Misconfigured dApps don't crash. They show the wrong numbers.**

Three short entries. A plain ruled list, not three identical cards.

- **The wrong network.** Your app was built for Base Sepolia. Your RPC answers
  Base Mainnet. Every read succeeds, and every read is wrong.
- **A lagging node.** It answers every call on time, with state that stopped
  being true a minute ago.
- **A contract that isn't there.** The address has no code on this network, so
  reads come back empty, and your interface shows zeros as if they were data.

### Six checks — LIVE

> **Six checks. Read-only. Seconds.**

These run in a fixed order, so numbering them is honest.

1. **RPC access** — Does the URL answer as a node? If not, is it DNS, a
   timeout, a rate limit, or a JSON-RPC error? Each one needs a different fix.
2. **Network identity** — Is the node on the network your app expects?
3. **Node freshness** — Is its latest block recent, or is it serving stale
   state?
4. **Contract bytecode** — Is there actually a contract at that address, on
   this network?
5. **Critical read** — Does the contract answer the call your app makes, in the
   shape your app expects?
6. **Fallback RPC** — Does your backup answer, and is it on the same network? A
   backup on the wrong chain fails silently the day you need it.

### Verdicts — LIVE

> **A verdict you can act on.**

Show the three stamps (section 4) with one line each:

- `READY` — All six checks passed.
- `AT RISK` — Nothing critical failed, but something needs attention or could
  not be checked.
- `BLOCKED` — A critical check failed. The verdict names the root cause, not a
  list of symptoms.

Then two lines, set apart:

> Not tested never counts as passing.
>
> Every failure comes with what to do about it.

### Before and after — LIVE

> **One report proves nothing. Two do.**
>
> Run the broken setup and the fixed one side by side. DApp Doctor shows which
> checks your fix resolved, and names any it broke.

**Visual:** a compact delta, rendered in HTML rather than an image:

| Check | Before | After | |
|---|---|---|---|
| Network identity | FAIL | PASS | fixed |
| Fallback RPC | NOT TESTED | PASS | fixed |

`BLOCKED` stamp → `READY` stamp.

**Action:** `Compare two setups` → `https://dapp-doctor.vercel.app/compare`

### Ways in

> **Bring your config the way you have it.**

- **Fill in the details — LIVE.** Enter the RPC URL, the network your app
  expects, and optionally a contract and a fallback.
- **Paste it — NOT YET.** An RPC URL, a `.env` file, or your wagmi or hardhat
  config. It is read in your browser; only the values the checks need are sent.
- **Ask your agent — NOT YET.** Connect DApp Doctor to Claude Code or Cursor as
  an MCP server. Your agent reads the project and runs the diagnosis.
- **Point it at a repo — NOT YET.** Paste a public GitHub repository and DApp
  Doctor reads its configuration.

Until at least one NOT YET item ships, publish this section with only the LIVE
line, or drop the section.

### Pro — history LIVE, timeline NOT YET

> **Pro keeps the chart.**
>
> Every diagnosis is saved, so you can see when a configuration broke and prove
> when it was fixed.

- **LIVE:** saved diagnosis history.
- **NOT YET:** saved setups you re-check in one click, with a timeline of when
  each one broke and when it recovered. Leave out until shipped.

Plans, as configured in RevenueCat:

- **Monthly** — USD 9.99 per month
- **Yearly** — USD 79.99 per year
- **Lifetime** — USD 99.99, one-time

The app reads these live from RevenueCat; if the landing hardcodes them, they
must be kept in sync.

Required line, in plain view near the plans:

> During the hackathon, purchases are RevenueCat Test Store transactions. No
> card is charged.

**Action:** `See Pro plans` → `https://dapp-doctor.vercel.app/history`

### Trust — LIVE

> **Read-only by design.**
>
> No private keys, no seed phrases, no transactions. The only calls DApp Doctor
> makes are reads: `eth_call`, `eth_getCode`, `eth_chainId`, `eth_blockNumber`
> and `eth_getBlockByNumber`.
>
> It refuses private and internal network addresses before opening a
> connection, so it cannot be turned against the infrastructure it runs on.
>
> The code is open source.

**Action:** `Read the code` → the repository.

### Final call — LIVE

> **Your dApp has been lying long enough.**

**Action:** `Diagnose my dApp` → the app.

### Footer — LIVE

> Built for the Burning Token hackathon by NERDCONF, September 2026.

Links: the app, the repository.

---

## 4. Visual system — "clinic punk"

The energy of a punk zine — thick black borders, hard flat shadows, loud type —
applied to a clinic. It must read as its own product. Do not reuse Burning
Token's blue, pink and yellow, its speckle texture, or its expanded typeface.

### Colour carries meaning, and nothing else

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FFF1EE` | Page ground: ECG chart paper |
| `grid-fine` | `rgba(226, 88, 72, 0.13)` | 1 mm ECG grid |
| `grid-major` | `rgba(226, 88, 72, 0.30)` | 5 mm ECG grid |
| `ink` | `#000000` | Borders and type. Pure black, deliberately |
| `muted` | `#5B5451` | Secondary text |
| `sheet` | `#FFFFFF` | The two primary surfaces |
| `pen` | `#1B3BD1` | Ballpoint blue — **only** where the user acts, or is told to act |
| `triage-red` | `#E8231E` | `BLOCKED`, `FAIL` — status only |
| `triage-amber` | `#F5A400` | `AT RISK`, `WARN` — status only |
| `triage-green` | `#0FA85A` | `READY`, `PASS` — status only |

Triage colours never decorate. If something is red, something is broken.

### Type

| Role | Typeface | Notes |
|---|---|---|
| Headlines | **Big Shoulders** 700 / 900 (Google Fonts) | Condensed and heavy, the voice of a chart header. Tight leading (0.9). Sentence case. |
| Stamps | **Big Shoulders Stencil** 900 | Only for the verdict stamps |
| Body | **Public Sans** (Google Fonts) | Designed for government forms — which is what a clinical report is |
| Machine values | system mono stack | Only for URLs, addresses, chain ids, RPC method names |

Scale: hero headline `clamp(3rem, 8vw, 6.5rem)`; section headlines
`clamp(2rem, 4.5vw, 3.25rem)`; body `1.0625rem / 1.6`; keep lines under 70
characters.

### Texture

```css
body {
  background-color: #fff1ee;
  background-image:
    linear-gradient(rgba(226, 88, 72, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(226, 88, 72, 0.3) 1px, transparent 1px),
    linear-gradient(rgba(226, 88, 72, 0.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(226, 88, 72, 0.13) 1px, transparent 1px);
  background-size: 40px 40px, 40px 40px, 8px 8px, 8px 8px;
}
```

### Components

```css
/* A sheet pinned to the board. Primary surfaces only, never every block. */
.sheet { background: #fff; border: 3px solid #000; box-shadow: 6px 6px 0 #000; }

/* Main action. Pressing it pushes it into the page. */
.btn-pen {
  background: #1b3bd1; color: #fff; font-weight: 700;
  border: 3px solid #000; box-shadow: 4px 4px 0 #000;
  transition: transform 80ms ease, box-shadow 80ms ease;
}
.btn-pen:active { transform: translate(4px, 4px); box-shadow: 0 0 0 #000; }

.btn-plain {
  background: #fff; color: #000; font-weight: 600;
  border: 2px solid #000; box-shadow: 3px 3px 0 #000;
}

/* Verdict stamp: stencil type, triage colour, set at an angle like ink on paper. */
.stamp {
  font-family: "Big Shoulders Stencil", sans-serif; font-weight: 900;
  border: 4px solid currentColor; padding: 0.1em 0.45em;
  transform: rotate(-7deg); mix-blend-mode: multiply;
}
```

Hierarchy rule: only the hero and the before/after delta get the full
`.sheet` treatment. Lists, checks and symptoms are ruled rows — a border-bottom
per row — not boxes.

### Motion

- One orchestrated moment: the ECG strip draws itself once on load.
- A stamp lands with a short overshoot when it enters the viewport.
- Buttons press in on click.
- Nothing else moves. No fade-and-slide on every section, no hover animations
  on every block.
- Under `prefers-reduced-motion: reduce`, all of the above is off.

### Do not

These are the commonest tells of a generated page, and each one appeared in an
earlier version of this product:

- No arrows appended to links or buttons (`Compare →`).
- No meta strings joined with middle dots (`6 checks · 1.2 s · today`).
- No tracked-out all-caps labels above headings.
- No near-black stand-in (`#0B0B0B`, `#111`); black is `#000`.
- No dark theme with a single neon accent.
- No accenting one word of a headline in another colour or style.
- No identical rounded cards with soft grey shadows.

### Quality floor

Responsive down to 360 px wide. Visible keyboard focus (`3px solid #1B3BD1`).
Colour contrast AA or better. The ECG strip has an accessible label that states
the rhythm in words, and its meaning is carried by shape, not only by colour.

---

## 5. Signature element — the ECG strip

A heartbeat whose rhythm is the verdict. Steady for `READY`, arrhythmic for
`AT RISK`, weakening into a flat line for `BLOCKED`. On the landing it beats
steadily in the hero; the before/after section can show `BLOCKED` becoming
`READY`.

Reference implementation, framework-agnostic — it returns an SVG path:

```ts
type Rhythm = 'idle' | 'READY' | 'AT_RISK' | 'BLOCKED' | 'NOT_TESTED';

const WIDTH = 720;
const BASELINE = 72; // viewBox 0 0 720 120

// One PQRST complex as (dx, dy) from the baseline; negative dy goes up.
const BEAT: Array<[number, number]> = [
  [0, 0], [10, 0], [15, -8], [20, 0], [26, 0], [29, 6], [34, -56],
  [39, 14], [43, 0], [52, 0], [60, -14], [68, 0], [80, 0],
];

const RHYTHMS: Record<Rhythm, Array<{ gap: number; amp: number }>> = {
  idle: Array.from({ length: 6 }, () => ({ gap: 40, amp: 0.35 })),
  READY: Array.from({ length: 6 }, () => ({ gap: 40, amp: 1 })),
  AT_RISK: [
    { gap: 30, amp: 1 }, { gap: 110, amp: 0.55 }, { gap: 20, amp: 1.1 },
    { gap: 90, amp: 0.4 }, { gap: 35, amp: 0.9 },
  ],
  BLOCKED: [{ gap: 40, amp: 1 }, { gap: 60, amp: 0.45 }, { gap: 90, amp: 0.15 }],
  NOT_TESTED: [{ gap: 60, amp: 0.2 }, { gap: 160, amp: 0.2 }],
};

export function ecgPath(rhythm: Rhythm): string {
  const points = [`M0,${BASELINE}`];
  let x = 0;
  for (const { gap, amp } of RHYTHMS[rhythm]) {
    x += gap;
    points.push(`L${x},${BASELINE}`);
    for (const [dx, dy] of BEAT) points.push(`L${x + dx},${BASELINE + dy * amp}`);
    x += BEAT[BEAT.length - 1][0];
  }
  points.push(`L${WIDTH},${BASELINE}`); // whatever is left is flat
  return points.join(' ');
}
```

```html
<svg viewBox="0 0 720 120" preserveAspectRatio="none" role="img"
     aria-label="Steady rhythm: all checks passed">
  <path d="…ecgPath('READY')…" pathLength="1" class="ecg-trace"
        fill="none" stroke="#000" stroke-width="3"
        stroke-linejoin="round" stroke-linecap="round"
        vector-effect="non-scaling-stroke" />
</svg>
```

```css
@keyframes ecg-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
.ecg-trace { stroke-dasharray: 1; animation: ecg-draw 1.4s cubic-bezier(.3,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .ecg-trace { animation: none; } }
```

Accessible labels per rhythm:

- `READY` — "Steady rhythm: all checks passed"
- `AT_RISK` — "Irregular rhythm: some checks need attention"
- `BLOCKED` — "Flatline: a critical check failed"
- `NOT_TESTED` — "No signal: nothing could be checked"
- `idle` — "Waiting for a diagnosis"

---

## 6. What the page may claim, and what it must not

**May claim — all true and verified in production:**

- The six checks listed above, run against live networks.
- The three verdicts, and that not tested never counts as passing.
- Before/after comparison of two configurations.
- Read-only: no keys, no signing, no transactions.
- Refusal of private and internal network addresses.
- Pro diagnosis history, sold through RevenueCat with Test Store purchases.
- Open-source code.

**Must not claim:**

- AI diagnosis or AI root-cause analysis. It is written but not live.
- Monitoring, alerts or scheduled checks. Not built.
- The paste box, the MCP server or the GitHub reader — until each ships.
- User counts, testimonials, logos of companies using it, or uptime figures.
  None exist, and inventing them breaks the hackathon's rules.

---

## 7. Acceptance checklist

- [ ] Every published section is LIVE; nothing NOT YET is visible.
- [ ] Every call to action opens the right page of the live app.
- [ ] Works at 360 px, 768 px and 1440 px wide.
- [ ] Keyboard-only navigation reaches every action, with visible focus.
- [ ] With reduced motion enabled, nothing animates.
- [ ] None of the "Do not" items appear anywhere.
- [ ] The Test Store line is visible next to the plans.
- [ ] Largest contentful paint under 2.5 s on a mid-range phone.
