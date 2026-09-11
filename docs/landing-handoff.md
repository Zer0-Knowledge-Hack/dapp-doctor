# DApp Doctor landing handoff

This is an isolated landing implementation based on `docs/landing-brief.md`.
Integration and production deployment remain separate steps requiring the owner's instruction.

## Locations

- Branch: `codex/landing-clinic-punk`
- Initial landing commit: `e5d486e`
- Latest UI implementation commit: `c296701` (continuous heartbeat)
- Worktree: `C:/Burning token/dapp-doctor-landing/preview`
- Copy-ready files: `C:/Burning token/dapp-doctor-landing/delivery`
- Base commit: `a1d052c`
- Local preview: `http://127.0.0.1:3740`

The delivery folder contains exactly the 19 files listed in section 8 of the
brief. The preview folder is a separate Git worktree of the existing project,
with its own pnpm installation. No dependency or configuration changes were
made. Work in the original checkout is independent of this branch.

## Run locally

From the preview folder, using pnpm only:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm start --hostname 127.0.0.1 --port 3740
```

For further editing, stop the preview process and use:

```powershell
pnpm dev --hostname 127.0.0.1 --port 3740
```

## Implementation

- Next.js server components, strict TypeScript and Tailwind v4.
- No new packages, UI kits, animation libraries or client components.
- Copy and availability flags are centralized in
  `src/components/landing/content.ts`. Sections and items render only when LIVE.
- `layout.tsx` preserves the provided source block. The owner subsequently
  requested continuous heartbeat motion: `globals.css` and `Ecg.tsx` now extend
  the supplied implementation for that purpose, retaining the design tokens
  and ECG accessibility labels.
- Only the hero and comparison use the full sheet treatment.
- The example comparison is explicitly labeled; it is not a live diagnostic.
- Verdicts use colored borders with black stencil lettering for readable text,
  including the amber status on chart paper.
- The compact stamps shrink on mobile to keep the before/after columns separate.
- Links disable speculative prefetching of the diagnosis and history tools.
- The hero and READY comparison strip scroll continuously through six beats
  every five seconds. Two identical SVG paths join seamlessly at the baseline.
  This is an illustration, not a live network health feed. BLOCKED remains the
  original weakening trace and flat line; other statuses retain their shapes.
- Each moving strip has a native keyboard-accessible pause checkbox. CSS handles
  the animation and pause state; reduced motion shows a static trace and hides
  the unnecessary pause control. No client component or dependency was added.

## Integration still required

Do not blindly replace the current homepage. First preserve the diagnosis tool
at `src/app/diagnose/page.tsx`, then apply the landing files. Add support for
`/diagnose?demo=broken` to prefill and run the broken example. These integration
changes were explicitly excluded from the landing brief and are not part of
this branch. Until integration, diagnosis links return 404 in this preview.

The existing `/compare` and `/history` routes are present in the worktree, but
this preview does not copy production secrets or purchase configuration.

Review the supplied global stylesheet and layout against the other app screens
when integrating. The brief requires replacing both files, which affects the
whole app. Confirm the production feature claims and the three hardcoded plan
prices against the live product and RevenueCat before publishing. This work
uses the brief's LIVE flags; it does not independently certify production.

The implementation deliberately leaves the app engine, API routes, billing,
comparison/history pages, scripts, package manifest and lockfile untouched.

## Verification and limits

- `pnpm typecheck` and `pnpm build` pass in the isolated worktree.
- Reviewed in the browser at 360, 768 and 1440 px.
- No horizontal page overflow at those widths; compact mobile stamps adjusted.
- All landing actions are keyboard reachable with visible focus.
- No browser console errors observed on the landing.
- Heartbeat update: observed changing SVG transforms while running, a stable
  transform while paused, and keyboard Space resuming the animation. Both READY
  strips animate independently; the BLOCKED example has no looping track.
- NOT_YET copy is absent from the rendered page.
- Test Store disclosure is visible next to the plans.
- Reduced-motion CSS disables trace/stamp animations and button transitions;
  the OS preference itself was not switched during this review.
- The production build reports missing fallback font metrics for Big Shoulders
  and Big Shoulders Stencil. It exits successfully, and the actual web fonts
  load in the browser. The provided font definitions were kept unchanged.
- No mid-range-phone LCP benchmark was performed. Do not present the brief's
  2.5-second target as a measured result.
- Full integration verification (`pnpm verify`) and live route checks belong to
  the integration step, after the diagnosis route is preserved.

## Frontend preservation contract — explicit owner requirement

The owner requires future changes to preserve this frontend as delivered:
the same palette, typography, components, layout and visual behavior. This
applies to integration, bug fixes and feature additions, not only to the first
copy of the landing. A functionality request is not permission to redesign.
Change an established visual decision only when the owner explicitly requests
that change. Do not claim that these rules guarantee the absence of bugs:
verify the actual result after each change.

### Visual source of truth

Use commit `e5d486e` as the initial visual reference, with the owner's subsequent
continuous-heartbeat request as an approved motion-only extension. Read the existing
components, `src/app/globals.css`, `src/app/layout.tsx` and
`src/components/landing/content.ts` before editing. After an owner-approved
visual change, document the new baseline; do not gradually drift from it.

Preserve these tokens and their roles. Reuse the named Tailwind utilities
rather than introducing slightly different hardcoded colors.

| Token | Value | Use |
|---|---|---|
| paper | `#FFF1EE` | ECG paper background |
| grid-fine | `rgba(226, 88, 72, 0.13)` | Fine ECG grid |
| grid-major | `rgba(226, 88, 72, 0.30)` | Major ECG grid |
| ink | `#000000` | Type and borders; pure black |
| muted | `#5B5451` | Secondary text |
| sheet | `#FFFFFF` | Primary sheet surfaces |
| pen | `#1B3BD1` | User actions and action guidance |
| triage-red | `#E8231E` | BLOCKED / FAIL status |
| triage-amber | `#F5A400` | AT RISK / WARN status |
| triage-green | `#0FA85A` | READY / PASS status |

- Keep Big Shoulders 700/900 for headings, Big Shoulders Stencil 900 for
  verdict stamps, Public Sans for body text, and the existing system monospace
  stack for machine values. Preserve the current sizes, line heights and weights.
- Preserve the chart-paper grid, spacing, content widths, section order,
  responsive breakpoints, thick black borders and hard offset shadows.
- Keep the full sheet treatment limited to the hero and before/after example.
  Symptoms, checks and other lists remain ruled rows.
- Keep black stamp lettering with status-colored borders and the smaller
  mobile stamps. Status must remain readable without relying on color alone.
- Reuse `ButtonLink`, `Sheet`, `Stamp` and `Ecg`. Extend a shared component
  compatibly when needed; do not create a competing version of the same control.
- Preserve the ECG rhythms, accessibility labels, limited CSS motion,
  reduced-motion rules, keyboard focus and button press behavior.
- Keep copy and LIVE / NOT_YET flags centralized. Do not expose unfinished
  functionality or change the marketing copy as part of a technical refactor.
- Do not introduce a dark theme, gradients, new accent colors, rounded card
  systems, soft shadows, icon packs, UI kits or animation libraries.

### Workflow for every modification

1. Work in a dedicated branch/worktree. Inspect its status and preserve other
   contributors' changes. Use only pnpm; never npm, npx or yarn. Keep the lockfile
   and dependencies unchanged unless the requested work actually requires them.
2. Open the current frontend and capture the affected areas at 360, 768 and
   1440 px before editing. Use those captures to compare the resulting layout,
   not memory of how the page looked.
3. Make the smallest relevant change. For logic or integration work, retain
   the existing markup and classes wherever possible. Avoid unrelated cleanup,
   copy changes or styling changes in the same patch.
4. Treat changes to global CSS, layout, fonts and shared components as affecting
   every consuming page. Review the landing and any affected diagnosis,
   comparison and history views; do not compensate for a regression by casually
   changing the global palette or design tokens.
5. Run `pnpm typecheck` and `pnpm build` after code changes. Follow the project's
   full `pnpm verify` requirement before integration/merge. Documentation-only
   edits do not require recompiling an unchanged frontend.
6. Reopen the resulting build at all three widths. Compare it with the baseline
   and check for overflow, clipped or overlapping text, displaced stamps,
   spacing changes, font substitutions and altered colors. Verify keyboard
   navigation, visible focus, reduced motion, console errors and affected links.
   Compilation alone does not establish that the frontend is intact.
7. Fix regressions caused by the patch before handing it back. If the requested
   behavior cannot fit the established design, explain the exact conflict and
   obtain the owner's design decision instead of silently redesigning it.
8. Report the files changed, the intended behavior, checks actually performed
   and any unresolved limitations. Keep the branch reviewable. Do not merge,
   push or deploy without the owner's instruction for that step.

At integration, carry this contract into the destination project's
`CLAUDE.md` or `AGENTS.md`, preserving its existing instructions, so future
agents receive it with the code. Do not leave the requirement only in a chat.

## Passing this to Claude

Review the branch or the copy-ready folder before integration. Keep pnpm as
the only package manager. Preserve current independent work in the original
checkout. Integrate the landing only after moving the existing diagnosis tool,
adding the broken-demo query behavior and reviewing global-style compatibility.
Follow the frontend preservation contract above for every subsequent change.
Do not push or publish without the owner's instruction.
