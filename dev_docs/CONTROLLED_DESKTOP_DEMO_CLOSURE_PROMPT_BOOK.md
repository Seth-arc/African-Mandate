# Controlled Desktop Demo Closure Prompt Book

Status: execution handbook for promoting the current build to
`complete_controlled_desktop_demo`.

This book converts the five remaining closure items into bounded prompts with
reproducible gates. It does not promote the game to a universal public release.
The supported target remains the desktop/laptop Chrome and Edge contract in
`dev_docs/PRODUCTION_READINESS.md`.

## How To Use This Book

1. Execute one numbered prompt at a time. Recommended order: 1, 2, 4, 3, 5.
2. Read every file listed by the prompt before editing.
3. Keep behavior changes, the narrowest regression tests, and affected docs in
   the same change.
4. The coding agent may create and edit files. The human operator runs every
   npm, Playwright, browser, CI, and deployment command.
5. A command is evidence only when its complete output and exit code come from
   the candidate commit. Historical results do not close a prompt.
6. Do not mark a prompt complete when a required artifact is missing, a test is
   flaky, or a warning has merely been hidden.
7. Do not change game rules, thresholds, action effects, geography, or ending
   logic to make a test or playthrough pass.

## Prompt Status

Only the human operator updates the Status column after reviewing current-head
evidence.

| Prompt | Closure | Initial state | Status |
| --- | --- | --- | --- |
| 1 | Warning-free verification gate | Functional gates pass; warnings remain | Not complete |
| 2 | Stable onboarding and recoverable end turn | Recovery exists; focused proof is missing | Not complete |
| 3 | Three complete 20-turn strategy playthroughs | No qualifying evidence | Not complete |
| 4 | Guest-first demo path and honest cloud status | Guest works; cloud claim is unproven | Not complete |
| 5 | Production-build Chrome and Edge stakeholder journey | Dev-server Chromium proof only | Not complete |

## Evidence Record Template

Create one record per prompt under
`dev_docs/demo_evidence/<YYYY-MM-DD>/prompt-<N>.md`. Do not create or populate an
evidence record until the human has run the gate.

```markdown
# Prompt N Evidence

- Candidate commit: <git SHA>
- Working tree: <clean, or exact intentional changes>
- Operator:
- Date and timezone:
- OS:
- Node version:
- npm version:
- Chrome version, when applicable:
- Edge version, when applicable:

## Commands And Results

| Command | Exit code | Result | Artifact or log |
| --- | ---: | --- | --- |
| `<exact command>` | 0 | Pass | `<path or CI URL>` |

## Manual Observations

- <observation>

## Blockers Or Waivers

- None.

## Verdict

- PASS or FAIL
```

A waiver is not a pass. Record its owner, date, user impact, rollback path, and
follow-up issue, then leave the prompt incomplete unless this book explicitly
allows the waiver.

---

## Prompt 1 — Produce One Clean Verification Run

### Copy/Paste Prompt

```text
Close the warning-free verification gate for the controlled desktop demo.

Read first:
- AGENTS.md and dev_docs/AGENTS.md
- package.json and package-lock.json
- .github/workflows/ci.yml
- src/ui/onboarding/DemoTour.tsx
- playwright.config.ts
- dev_docs/PRODUCTION_READINESS.md

Current evidence shows typecheck, 80 unit tests, production build, 67 static
asset references, and 12 E2E tests passing. Do not replace that evidence with a
claim. Fix the remaining React hook warning at its root without disabling the
rule or adding an eslint suppression. Make callbacks and effect dependencies
stable and preserve audio cleanup, waveform reset, reduced-motion behavior, and
unmount safety.

Treat the Vite large-chunk warning as owned work: either reduce the initial
chunk through justified code splitting, or define and document a measured demo
bundle budget and configure the warning threshold to that approved budget. Do
not raise the threshold merely to silence output. Record raw and gzip sizes.

Add a non-watch unit-test script, such as `test:run`, and a single deterministic
demo verification script if it can remain cross-platform. Align CI and docs
with the final commands. Do not add a runtime dependency.

Return exact files changed, tests changed, commands for the human to run, the
expected pass output, and any blocker. Do not mark this prompt complete.
```

### Required Human-Run Gate

Run from a clean checkout of the candidate commit:

```powershell
node --version
npm --version
npm ci
npm audit
npm audit --omit=dev
npm run typecheck
npm run lint -- --max-warnings=0
npx vitest run
npm run build
npm run test:e2e
git status --short
```

If Prompt 1 adds `test:run` and `verify:demo`, also run:

```powershell
npm run test:run
npm run verify:demo
```

### Completion Criteria

Prompt 1 passes only when all of the following are true:

- Every command exits with code 0 on the same candidate commit.
- Full and production-only npm audits both report zero vulnerabilities.
- TypeScript reports zero errors.
- ESLint reports zero errors and zero warnings with `--max-warnings=0`.
- Vitest runs once, exits without watch mode, and all tests pass.
- Static asset validation and the production build pass.
- The build emits no unowned warning. Any approved bundle budget is documented
  with measured minified and gzip sizes and has an explicit owner.
- The complete Playwright suite passes without retry masking a first-attempt
  failure.
- CI uses the same non-watch commands and passes at the candidate commit.
- `git status --short` contains no unexpected generated artifacts.

### Automatic Failure Conditions

- An eslint disable comment or reduced rule severity is used to hide the hook
  warning.
- The chunk warning limit is increased without a measured and documented demo
  budget.
- Vitest remains in watch mode or requires Ctrl+C.
- Test counts fall without an explained, reviewed replacement.
- Results are combined from different commits or dependency trees.

---

## Prompt 2 — Remove Onboarding Flakiness And Guard End-Turn Recovery

### Copy/Paste Prompt

```text
Make onboarding overlays deterministic and make end-turn transitions recover
without double advancement, lost state, or a permanently disabled action bar.

Read first:
- AGENTS.md and dev_docs/AGENTS.md
- src/ui/onboarding/DemoTour.tsx
- src/tour/TourContext.tsx
- src/ui/layout/ActionBar.tsx
- src/ui/modals/ModalRoot.tsx, especially TurnLoadingBody
- src/state/uiStore.ts
- src/state/gameStore.ts
- src/systems/turnEngine.ts
- tests/unit/uiStore.test.ts
- tests/unit/turnEngine.test.ts
- tests/e2e/player-journey.spec.ts
- dev_docs/PRODUCTION_READINESS.md

Fix the underlying overlay lifecycle rather than extending arbitrary sleeps or
adding more generic Escape presses. Stabilize effect dependencies, cancel all
timers/requestAnimationFrame work on close and unmount, prevent stale media
events from changing a later tour step, and restore focus to the launcher.

Guard end turn as an exactly-once state transition. Cover rapid repeated input,
media play rejection, video error, media that never emits `ended`, a missing
transition payload, modal close/unmount, and an exception before the transition
is queued. The player must either advance exactly once or regain an enabled
control with a clear retry/error path. Preserve deterministic ownership in
turnEngine; do not duplicate game logic in React.

Add focused tests rather than relying only on the broad player journey. The
broad journey helper must not conceal a product race by repeatedly pressing
Escape. Update recovery documentation if visible behavior changes.

Return exact files changed, the race or failure mechanism found, focused tests
added, commands for the human, and any blocker. Do not mark this prompt
complete.
```

### Required Tests To Add Or Strengthen

- A focused onboarding E2E test that opens, advances, skips/closes, reopens,
  and verifies focus restoration without arbitrary sleeps.
- An end-turn E2E test proving a rapid double click advances only one turn.
- An end-turn E2E test with media playback rejected or stalled, proving the
  fallback advances exactly once and returns control.
- A recovery test for absent/invalid pending transition state.
- A narrow unit or component-level test for pending-command cleanup after a
  thrown callback, if that failure is reachable.

Suggested new file:
`tests/e2e/onboarding-end-turn-recovery.spec.ts`.

### Required Human-Run Gate

```powershell
npm run typecheck
npm run lint -- --max-warnings=0
npx vitest run tests/unit/uiStore.test.ts tests/unit/turnEngine.test.ts
npx playwright test tests/e2e/onboarding-end-turn-recovery.spec.ts --workers=1
npx playwright test tests/e2e/onboarding-end-turn-recovery.spec.ts --repeat-each=10 --workers=1
npx playwright test tests/e2e/player-journey.spec.ts --repeat-each=5 --workers=1
```

Then run the full Prompt 1 gate.

### Completion Criteria

- All focused recovery scenarios exist and pass.
- Ten consecutive focused repetitions pass with zero retries, timeouts,
  page errors, or console errors.
- Five consecutive broad journeys pass with zero retries.
- No test uses a fixed sleep to wait for product state.
- One end-turn command produces exactly one turn increment, one transition,
  and one autosave attempt.
- A failed/stalled media element cannot block turn completion.
- A pre-transition exception restores the controls and exposes a meaningful
  error or retry route.
- Closing or unmounting an overlay leaves no active timers, animation frames,
  audio, stale focus trap, or later state update.
- Keyboard focus returns to the control that opened the onboarding flow.
- Typecheck and warning-free lint pass.

### Automatic Failure Conditions

- Stability depends on increasing Playwright timeouts, adding sleeps, or
  repeatedly pressing Escape without asserting the expected modal.
- A double click advances two turns or writes two committed saves.
- Recovery silently drops a valid next state.
- The UI calculates or mutates deterministic turn results itself.

---

## Prompt 3 — Complete Three Scripted 20-Turn Playthroughs

### Copy/Paste Prompt

```text
Create and execute three reproducible full-campaign playthroughs for the
controlled desktop demo: security-heavy, diplomacy-heavy, and balanced.

Read first:
- AGENTS.md and dev_docs/AGENTS.md
- dev_docs/FULL_GAME_SYSTEM_DESIGN.md
- dev_docs/FULL_GAME_LEVEL_DESIGN.md
- dev_docs/WIN_LOSS_SCORING_SPEC.md
- dev_docs/PRODUCTION_READINESS.md
- src/data/actions.json or the canonical action registry in src/data
- src/data/events.yaml
- src/systems/actionResolver.ts
- src/systems/turnEngine.ts
- tests/e2e/player-journey.spec.ts

Do not alter costs, effects, thresholds, event rules, availability conditions,
or ending logic to force a playthrough to reach Turn 20. Define three scripts
using only currently valid player actions. Make decision selection
deterministic and record any required enabling action.

Classification rules for evidence:
- Security-heavy: security is the largest single action category and security
  plus intelligence account for at least half of confirmed actions.
- Diplomacy-heavy: diplomacy is the largest single category and diplomacy plus
  community mediation account for at least half of confirmed actions.
- Balanced: use at least five action categories and no category accounts for
  more than 35 percent of confirmed actions.

Each qualifying run must complete Turn 20. An early deterministic ending is a
valid product observation but does not count as one of the three required
20-turn runs; record it, correct the script through legitimate player choices,
and rerun. A success or failure ending at Turn 20 may qualify.

Automate the deterministic interaction path where practical, but retain a
human observation record for narrative clarity, pacing, feedback, and
softlocks. Exercise guest save, page refresh, and resume at least once in each
run. Capture per-turn action choices, category totals, key metrics/resources,
events, save/resume point, ending, console errors, and operator observations.

Return exact files created or changed, the three scripts, action-category
totals, commands for the human, evidence templates, and any blocker. Do not
mark this prompt complete.
```

### Required Artifacts

- `tests/e2e/strategy-playthroughs.spec.ts` or an equivalent deterministic
  harness.
- `dev_docs/demo_evidence/<date>/security-heavy-playthrough.md`.
- `dev_docs/demo_evidence/<date>/diplomacy-heavy-playthrough.md`.
- `dev_docs/demo_evidence/<date>/balanced-playthrough.md`.

Each playthrough record must include this table:

```markdown
| Turn | Confirmed action(s) | Category | Key deltas | Event/dialogue | Save state | Observation |
| ---: | --- | --- | --- | --- | --- | --- |
```

It must also include category totals, final metrics/resources, ending type,
play duration, browser version, console/page errors, and a PASS/FAIL verdict.

### Required Human-Run Gate

Build and serve the production artifact in terminal 1:

```powershell
npm run build
npm run preview -- --host 127.0.0.1
```

Run the automated scripts in terminal 2 after the production-preview support
from Prompt 5 exists. Until then, set the current preview URL explicitly:

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
npx playwright test tests/e2e/strategy-playthroughs.spec.ts --project=chromium --workers=1
Remove-Item Env:PLAYWRIGHT_BASE_URL
Remove-Item Env:PLAYWRIGHT_SKIP_WEB_SERVER
```

The human operator must also perform each script once in the supported browser
and complete the evidence record. Automation alone does not assess pacing or
narrative clarity.

### Completion Criteria

- Three distinct runs reach and resolve Turn 20 from a fresh guest campaign.
- Each run satisfies its category classification using recorded confirmed
  actions.
- Each run saves, refreshes, resumes the same campaign, and preserves the exact
  turn, resources, metrics, action log, and event state expected at that point.
- No run requires developer tools, state injection, direct store mutation, URL
  shortcuts, test-only game flags, or rule changes.
- No run encounters an uncaught page error, unexplained console error,
  permanent disabled control, trapped modal, missing outcome, or lost save.
- The ending is deterministic when the same script is replayed against the
  same candidate commit and initial state.
- Material balance, pacing, narrative, or content defects are fixed with tests
  and docs or recorded as explicit blockers; they are not omitted from the
  evidence report.
- All three signed evidence records identify the same candidate commit.

### Automatic Failure Conditions

- A run ends before Turn 20.
- A strategy label is asserted without category counts.
- State is edited through localStorage, devtools, fixtures, or application
  internals to keep the campaign alive.
- A deterministic mismatch is dismissed as random variation.
- Only automated runs exist and no human playthrough observations were made.

---

## Prompt 4 — Make Guest Mode The Explicit Demo Path

### Copy/Paste Prompt

```text
Make guest mode the explicit, dependable path for the controlled desktop demo
and make the cloud-auth promise match current evidence.

Read first:
- AGENTS.md and dev_docs/AGENTS.md
- src/services/authService.ts
- src/services/saveService.ts
- src/services/supabaseClient.ts
- src/state/sessionStore.ts
- src/ui/modals/SessionManagerBody.tsx
- src/ui/layout/GameLayout.tsx
- tests/unit/authService.test.ts
- tests/unit/saveService.test.ts
- tests/e2e/player-journey.spec.ts
- dev_docs/PRODUCTION_READINESS.md
- README.md
- .env.example, if present

Guest mode must be visibly selected by default and described as browser-local.
The primary demo action must let a stakeholder continue as guest without
Supabase configuration, an account, or a network request to Supabase. Explain
that clearing site data, using private browsing cleanup, or changing browsers
can remove guest saves. Preserve clear save failure and retry feedback.

Choose one honest cloud closure:
A. Prove Google OAuth and Supabase cloud save/restore in a staged environment,
   including row-level isolation between two users; or
B. Label cloud sign-in/save as Experimental in all runtime and production copy
   and keep it outside the controlled-demo guarantee.

Use option B unless current staged evidence can satisfy every option A gate.
Unit tests with mocked Supabase clients do not count as live proof. Do not place
a service-role key or reusable backend secret in any VITE_* variable.

Add focused guest entry/save/resume/recovery E2E coverage. If UI or operator
behavior changes, update README and production readiness documentation in the
same change.

Return the selected cloud closure, exact files changed, tests added, commands
for the human, manual checks, and any blocker. Do not mark this prompt complete.
```

### Required Human-Run Guest Gate

```powershell
npm run typecheck
npm run lint -- --max-warnings=0
npx vitest run tests/unit/authService.test.ts tests/unit/saveService.test.ts tests/unit/sessionPreferences.test.ts
npx playwright test tests/e2e/guest-session.spec.ts --workers=1
```

Then perform this supported-browser manual check:

1. Use a normal Chrome profile with no Supabase environment variables.
2. Enter explicitly as guest and start a named campaign.
3. Confirm an action and end a turn.
4. Manually save, refresh the page, and resume the same campaign.
5. Verify turn, metrics, resources, logs, and session name are preserved.
6. Rename the save, refresh, and verify the new name persists.
7. Trigger a controlled storage-write failure in a test profile and verify a
   visible retry/error state without losing the active game.

### Additional Option A Cloud Gate

If cloud mode will be presented as supported rather than Experimental, record a
staged manual run proving:

- Google OAuth login and callback complete in Chrome and Edge.
- A profile record is synchronized for the authenticated user.
- A cloud campaign can be created, saved, refreshed, resumed, renamed, and
  deleted.
- Autosave and manual save failures show recovery feedback.
- User A cannot list, read, update, or delete User B's profile or sessions.
- Signing out returns to guest mode without exposing cloud saves.
- No service-role key or reusable backend secret appears in source, `dist`,
  browser storage, or browser network traffic.

### Completion Criteria

- Guest is the obvious default demo path in entry UI and documentation.
- Guest entry works with Supabase unconfigured or unavailable.
- Guest save/refresh/resume behavior passes automated and manual checks.
- Storage limitations are visible before the stakeholder relies on the save.
- Save failure leaves the campaign playable and offers meaningful retry
  guidance.
- Cloud is either fully proven by the Option A gate or visibly labeled
  Experimental everywhere it is offered or described.
- Runtime copy, README, and production readiness docs use the same support
  claim.
- The full Prompt 1 gate passes.

### Automatic Failure Conditions

- Google sign-in or cloud save is described as supported based only on mocks.
- Guest entry makes a required Supabase request or fails without Supabase
  configuration.
- Guest limitations are hidden only in documentation.
- Any backend secret is added to a VITE_* variable or browser bundle.
- Guest and authenticated session lists cross identity boundaries.

---

## Prompt 5 — Prove The Production Build In Chrome And Edge

### Copy/Paste Prompt

```text
Make the built `dist` artifact, not the Vite development server, pass the full
stakeholder journey in installed stable Chrome and Microsoft Edge.

Read first:
- AGENTS.md and dev_docs/AGENTS.md
- package.json
- playwright.config.ts
- .github/workflows/ci.yml
- tests/e2e/player-journey.spec.ts
- dev_docs/PRODUCTION_READINESS.md
- dev_docs/FULL_PUBLIC_PRODUCTION_GAME_FIXES.md, P0.10 and P0.11
- README.md

Add a deterministic production-preview E2E mode that builds first and serves
`dist` through `vite preview`. Keep the development-server mode available for
fast local work. Ensure base URL, port, and server ownership are explicit so a
stale development server cannot satisfy the production gate.

Add Playwright projects for the supported installed browser channels: Chrome
and Microsoft Edge. Keep bundled Chromium for portable CI coverage. Do not
claim Chrome or Edge coverage from a user-agent override.

Extend the supported-browser stakeholder journey to cover:
landing entry -> explicit guest campaign -> valid action -> end turn -> manual
save -> page refresh -> resume -> deterministic outcome -> outcome review ->
restart campaign -> fresh Turn 1 state.

Fail on uncaught page errors and unexpected console errors. Retain trace,
screenshot, and video on failure. Update CI to test the built artifact with
bundled Chromium; keep real Chrome and Edge as required Windows promotion
evidence if those installed channels are unavailable on CI.

Update production readiness and README commands. Return exact files changed,
tests added, production server design, commands for the human, expected
artifacts, and any blocker. Do not mark this prompt complete.
```

### Required Human-Run Gate

The implementation should expose stable scripts equivalent to
`test:e2e:preview`. After those scripts exist, run:

```powershell
npm ci
npm run build
npm run test:e2e:preview -- --project=chromium
npm run test:e2e:preview -- --project=chrome
npm run test:e2e:preview -- --project=edge
```

If preview-server orchestration is not yet implemented, use two terminals.

Terminal 1:

```powershell
npm run build
npm run preview -- --host 127.0.0.1
```

Terminal 2:

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
npx playwright test --project=chromium
npx playwright test --project=chrome
npx playwright test --project=edge
Remove-Item Env:PLAYWRIGHT_BASE_URL
Remove-Item Env:PLAYWRIGHT_SKIP_WEB_SERVER
```

Also perform the stakeholder script manually once in Chrome and once in Edge.
Record exact browser versions and whether every step completed without
developer intervention.

### Completion Criteria

- The E2E server is `vite preview` serving the candidate `dist`, not
  `npm run dev` and not a stale server.
- Bundled Chromium, installed Chrome, and installed Edge projects all pass the
  full supported journey on the candidate commit.
- Chrome and Edge each cover entry, guest start, action, end turn, save,
  refresh/resume, outcome, and restart.
- Restart clears the completed campaign from active runtime state and opens a
  fresh campaign at Turn 1 without stale metrics, logs, selections, ending, or
  modal state.
- No first-attempt failure is hidden by retry; promotion evidence shows zero
  retries.
- No unexpected console error, page error, failed required asset, or unhandled
  request occurs.
- CI builds before production-preview E2E and tests the same artifact produced
  by its build job.
- Manual Chrome and Edge evidence includes browser versions, candidate commit,
  operator, date, and PASS/FAIL.
- Production readiness and README match the tested browser matrix and command.

### Automatic Failure Conditions

- Tests pass only against the Vite development server.
- Edge or Chrome is simulated only through a user-agent string.
- The journey stops at the outcome without proving restart.
- A stale server, old `dist`, or different commit supplied the passing result.
- Required assets return errors that the test ignores.

---

## Final Promotion Gate

The build may be called a `complete_controlled_desktop_demo` only after all five
prompt evidence records pass against the same candidate commit or after later
prompts explicitly rerun and supersede earlier evidence on that commit.

Record the candidate state:

```powershell
git rev-parse HEAD
git status --short
node --version
npm --version
```

Run the final automated gate using the scripts created by the prompts:

```powershell
npm ci
npm audit
npm audit --omit=dev
npm run typecheck
npm run lint -- --max-warnings=0
npm run test:run
npm run build
npm run test:e2e:preview -- --project=chromium
npm run test:e2e:preview -- --project=chrome
npm run test:e2e:preview -- --project=edge
```

Final promotion also requires:

- Three signed 20-turn playthrough records: security-heavy,
  diplomacy-heavy, and balanced.
- A signed guest-mode record and either signed live-cloud evidence or visible
  Experimental labeling.
- Signed manual stakeholder journeys in Chrome and Edge.
- Zero unresolved P0 defects affecting entry, action, end turn, save, resume,
  outcome, restart, deterministic state, keyboard access, or supported-browser
  operation.
- Every known limitation visible in `dev_docs/PRODUCTION_READINESS.md` and, when
  user-relevant, in the runtime UI.

The human operator makes the promotion decision. Agents report evidence and
blockers but do not change the Prompt Status table to Complete.
