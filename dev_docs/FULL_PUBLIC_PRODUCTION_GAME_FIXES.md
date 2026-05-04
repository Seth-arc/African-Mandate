# Full Public Production Game Fixes

Status: implementation backlog for moving from `controlled_desktop_demo` to
`full_public_production_game`.

Source audit: `dev_docs/PRODUCTION_JOURNEY_AUDIT_2026-05-04.md`

This file is the single promotion plan. It defines the fixes, target files,
tests, evidence, and release gates needed before the build can honestly be
called a full public production game.

Per repository instructions, agents should not run npm, docker, migrations, or
deployment commands unless explicitly asked. The commands below are for the
human operator to run.

## Target Release Contract

The build can be promoted to `full_public_production_game` only when all of the
following are true:

- A first-time player can enter, understand, play, save, resume, complete, and
  recover from common failures without developer intervention.
- Supported browsers, devices, input methods, and accessibility guarantees are
  explicitly defined and tested.
- Local save, cloud save, auth, resume, and data isolation behavior are proven.
- The production build, not only the Vite dev server, passes E2E verification.
- Public-facing docs, support docs, runtime behavior, and CI gates agree.
- Security, dependency, content-rights, and privacy risks have release evidence.
- Known deferred features are not promised in runtime copy or production docs.

## Release Decision Model

- `P0`: blocks promotion to `full_public_production_game`.
- `P1`: should block public launch unless explicitly accepted by product,
  engineering, and content/legal owners.
- `P2`: hardening work that should be scheduled before or immediately after
  launch, but does not alone block if all P0/P1 items pass.

No P0 item should be waived silently. A waiver requires owner, date, user
impact, rollback path, and follow-up issue.

## Phase 0 - Declare The Production Surface

### P0.1 Define the supported release target

Fix:
- Replace ambiguous "desktop demo" language with a concrete production support
  contract.
- Define supported browsers, screen sizes, pointer/keyboard expectations,
  audio/video assumptions, storage assumptions, and network requirements.
- Keep unsupported journeys visible before the player invests time.

Primary files:
- `README.md`
- `dev_docs/PRODUCTION_READINESS.md`
- `dev_docs/BUILD_PUBLIC_GAME.md`
- `dev_docs/GAME_UI_UX_SPECIFICATION.md`
- `dev_docs/FULL_GAME_SYSTEM_DESIGN.md`

Tests/evidence:
- Add a release-support matrix section to production docs.
- Add E2E cases for every supported and unsupported device class.

Acceptance criteria:
- There is exactly one source of truth for supported production behavior.
- The product no longer reads as both a desktop-only demo and a full public
  game.
- Unsupported users see a clear gate before starting a session.

### P0.2 Canonicalize stale build and UX docs

Fix:
- Mark old scaffold/build steps as historical, or update them to current
  runtime truth.
- Remove references that say the turn engine or save service still need to be
  built if those systems already exist.
- Replace the outdated `index.html -> game.html` journey with the actual
  embedded React app flow.
- Align leaderboard status across docs and runtime copy.

Primary files:
- `BUILD_STEPS.md`
- `dev_docs/GAME_UI_UX_SPECIFICATION.md`
- `dev_docs/WIN_LOSS_SCORING_SPEC.md`
- `dev_docs/PRODUCTION_READINESS.md`

Tests/evidence:
- Add a documentation review checklist to the release checklist.
- Add a static docs grep check if practical for deprecated phrases:
  - `game.html`
  - `Already stubbed`
  - `Awaiting event list`
  - leaderboard claims if leaderboard remains deferred

Acceptance criteria:
- A new operator can read docs and understand the real production runtime.
- No production doc promises a deferred feature.

## Phase 1 - Fix State, Persistence, And Replay Integrity

### P0.3 Resolve `intel_layer_state` contract drift

Fix:
- Choose one path:
  - Path A: production needs intel layer state. Add it to runtime state.
  - Path B: production does not need intel layer state. Remove it from the
    production contract and schema expectations.
- Preferred path for full public production: Path A, because the database and
  design docs already define it.

Primary files for Path A:
- `src/state/types.ts`
- `src/state/initState.ts`
- `src/state/gameSetup.ts`
- `src/systems/validation.ts`
- `src/services/saveService.ts`
- `src/ui` or `src/map` files that read/write intel layer visibility
- `supabase/supabase.sql`
- `supabase/migrations/202603080001_phase_r1_persistence_auth.sql`
- `dev_docs/FULL_GAME_SYSTEM_DESIGN.md`
- `dev_docs/PRODUCTION_READINESS.md`

Tests to add:
- Unit test: initial state includes the intel layer state contract.
- Unit test: validation rejects malformed intel layer state.
- Unit test: local save persists and restores intel layer state.
- Integration/stub test: cloud save payload writes `intel_layer_state`.
- Migration compatibility test or documented manual check for existing rows.

Acceptance criteria:
- State type, initial state, validator, local save, cloud save, and DB schema
  all agree.
- Existing saves load with a deterministic default.
- Future replay/resume code can trust the persisted value.

### P0.4 Make cloud session plus action-log persistence atomic

Fix:
- Replace the client sequence of upsert session, delete action log, insert
  action log with one transactional Supabase RPC or server-side function.
- Return a typed success/failure result.
- Do not leave a partially updated remote save visible as successful.

Primary files:
- `src/services/saveService.ts`
- `supabase/supabase.sql`
- `supabase/migrations/*`
- `dev_docs/PRODUCTION_READINESS.md`
- New or existing Supabase/RLS test docs

Tests to add:
- Unit test: save service calls one atomic persistence boundary.
- Integration test: simulated action-log insert failure does not leave session
  and action log mismatched.
- RLS test: user A cannot persist into user B session.
- RLS test: user A cannot read user B action logs.

Acceptance criteria:
- A cloud save is either fully committed or fully rejected.
- UI does not report "saved" on partial persistence.
- Support/debug tooling can rely on session and action log consistency.

### P0.5 Add cloud save conflict and failure recovery

Fix:
- Define conflict rules between local and cloud saves.
- Add explicit UI states for:
  - offline
  - authenticated but cloud save failed
  - expired session
  - remote save newer than local save
  - local save newer than remote save
  - merge not possible
- Preserve the player's current game state when recovery UI opens.

Primary files:
- `src/services/saveService.ts`
- `src/services/authService.ts`
- `src/state/sessionStore.ts`
- `src/ui/modals/SessionManagerBody.tsx`
- `src/app/App.tsx`
- `dev_docs/PRODUCTION_READINESS.md`

Tests to add:
- Unit tests for conflict selection logic.
- E2E test for cloud save failure banner and retry.
- E2E test for expired session during save.
- E2E test for resume from local after cloud failure.

Acceptance criteria:
- A player never loses progress silently.
- The UI tells the player whether the current state is local-only, cloud-saved,
  or needs attention.

## Phase 2 - Fix The Core Player Journey

### P0.6 Add guarded turn resolution and retry UI

Fix:
- Wrap turn advancement in a guarded function.
- Catch turn-resolution errors from event handlers.
- Open a recovery surface with retry, return to current turn, and support-safe
  error code.
- Do not render raw exception details to the player.

Primary files:
- `src/ui/layout/ActionBar.tsx`
- `src/state/gameStore.ts`
- `src/app/ErrorBoundary.tsx`
- `src/utils/telemetry.ts`
- `src/ui/modals/ModalRoot.tsx`

Tests to add:
- Unit test: thrown turn resolution does not mutate current state.
- Component/E2E test: turn failure shows retry UI.
- E2E test: player can retry or continue from previous valid state.

Acceptance criteria:
- A failed turn never drops the player into a broken app shell.
- The player sees a clear recovery path and a stable support code.

### P0.7 Fix campaign-complete action affordance

Fix:
- Remove the unreachable "open outcome from disabled End Turn" branch, or make
  the campaign-complete action reachable through a dedicated button.
- Use one clear outcome entry point across the action bar and status panels.

Primary files:
- `src/ui/layout/ActionBar.tsx`
- `src/ui/layout/GameLayout.tsx`
- `src/ui/modals/ModalRoot.tsx`
- Any scenario/status panel that opens outcome

Tests to add:
- Unit or component test for completed campaign CTA state.
- E2E test: player reaches outcome report from the completed campaign state.

Acceptance criteria:
- Completed players can always open the outcome report.
- No disabled control tells players to take an impossible action.

### P1.1 Strengthen first-session onboarding and failure states

Fix:
- Ensure onboarding, mission briefing, session manager, action selection,
  event modal, and outcome report all have explicit loading, empty, error,
  retry, and degraded states.
- Where no data should be empty, treat empty data as a production error and
  surface recovery.

Primary files:
- `src/app/App.tsx`
- `src/ui/modals/ModalRoot.tsx`
- `src/ui/modals/SessionManagerBody.tsx`
- `src/ui/layout/GameLayout.tsx`
- `src/ui/layout/ActionBar.tsx`
- `src/ui/panels/*`

Tests to add:
- E2E test for first-time entry through onboarding into playable game.
- E2E test for missing/failed session load.
- E2E test for modal recovery paths.

Acceptance criteria:
- A full player journey does not rely on "happy path only" UI.

## Phase 3 - Accessibility And Motion

### P0.8 Make interactive intel surfaces keyboard-equivalent

Fix:
- Replace `role="button"` list items with native buttons where possible.
- Support Enter and Space for any custom interactive element that remains.
- Either enable keyboard interaction for map intel markers or provide a
  synchronized keyboard route that is visibly equivalent.

Primary files:
- `src/ui/panels/IntelFeed.tsx`
- `src/map/MapView.tsx`
- `src/styles/globals.css`

Tests to add:
- Component test: Intel feed items activate on Enter and Space.
- E2E test: keyboard-only player can inspect intel and choose actions.
- Accessibility scan covering active game and modals.

Acceptance criteria:
- Keyboard users can reach all decision-relevant intel.
- No visible interactive control is mouse-only unless a documented equivalent
  path exists and is tested.

### P0.9 Add reduced-motion support to the landing and cinematic layer

Fix:
- Detect `prefers-reduced-motion` in `index.html` JavaScript.
- Disable or shorten GSAP timelines, smooth scrolling, animated transitions,
  and cinematic autoplay flows for reduced-motion users.
- Keep the route to "enter game" direct and functional.

Primary files:
- `index.html`
- `src/styles/globals.css`
- `tests/e2e/player-journey.spec.ts` or a new reduced-motion spec

Tests to add:
- E2E test with reduced motion enabled.
- E2E test that intro video/animation bypass still enters the game.

Acceptance criteria:
- Reduced-motion users can start and play without forced cinematic motion.

### P1.2 Harden landing modal focus behavior

Fix:
- Add focus trap and focus return for plain HTML landing/about/mobile modals.
- Ensure Escape closes the correct modal.
- Ensure background content is inert or effectively hidden while modal is open.

Primary files:
- `index.html`
- `src/styles/globals.css`

Tests to add:
- E2E keyboard test for opening and closing landing modals.
- Accessibility scan for landing modals.

Acceptance criteria:
- Modal focus never escapes behind the active dialog.
- Closing a modal returns focus to the triggering control.

## Phase 4 - Device, Browser, And Production Build Evidence

### P0.10 Add production-preview E2E testing

Fix:
- Run E2E against `npm run preview` after `npm run build`, not only against
  the Vite dev server.
- Keep dev-server E2E useful for development, but make production-preview E2E
  the release gate.

Primary files:
- `playwright.config.ts`
- `package.json`
- `.github/workflows/ci.yml`
- `dev_docs/PRODUCTION_READINESS.md`

Tests to add:
- New production-preview E2E job in CI.

Acceptance criteria:
- The exact built artifact path is tested before release.
- Release evidence cannot come only from the dev server.

Suggested human-run gate:

```powershell
npm run build
npm run preview
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
npm run test:e2e
```

### P0.11 Add browser and device matrix coverage

Fix:
- Define the supported matrix.
- At minimum, test Chromium, Firefox, and WebKit if the public claim is
  "modern browsers".
- If the game remains desktop-only, test unsupported phone, tablet, and hybrid
  touch paths.

Primary files:
- `playwright.config.ts`
- `tests/e2e/player-journey.spec.ts`
- `dev_docs/PRODUCTION_READINESS.md`
- `README.md`

Tests to add:
- Desktop Chromium full journey.
- Desktop Firefox full journey.
- Desktop WebKit full journey.
- iPhone gate.
- iPad/tablet gate or supported tablet journey.
- Hybrid touch laptop gate or supported journey.

Acceptance criteria:
- The browser/device support matrix is proven by tests.
- Unsupported devices receive clear user-facing guidance.

### P1.3 Add performance budgets

Fix:
- Define production budgets for:
  - first meaningful landing render
  - time to game-ready state
  - JS bundle size
  - media payload size
  - map interaction responsiveness
  - save/resume latency
- Add CI or manual release-gate evidence.

Primary files:
- `dev_docs/PRODUCTION_READINESS.md`
- `.github/workflows/ci.yml`
- New performance script or Playwright perf spec if needed

Tests/evidence:
- Lighthouse or Playwright performance report against production preview.
- Bundle size report.

Acceptance criteria:
- A production candidate cannot grow beyond agreed budgets without a tracked
  release decision.

## Phase 5 - Security And Supply Chain

### P0.12 Remove external script launch dependency or harden it

Fix:
- Prefer vendoring GSAP, ScrollTrigger, and Lenis through npm or local checked
  assets.
- If CDN use remains, add subresource integrity, pinned versions, fallback
  behavior, and a no-CDN E2E test.

Primary files:
- `index.html`
- `package.json`
- `package-lock.json`
- `scripts/validate-static-assets.mjs`
- `.github/workflows/ci.yml`

Tests to add:
- E2E test: blocked external scripts still allow game entry or show a clear
  fallback.
- Static asset validation for locally vendored scripts if vendored.

Acceptance criteria:
- A CDN outage cannot silently block the player from reaching the game.

### P0.13 Add dependency audit and secret scan gates

Fix:
- Add production CI jobs for dependency vulnerabilities and committed secrets.
- Scan the release branch and relevant history, not only the latest diff.

Primary files:
- `.github/workflows/ci.yml`
- `dev_docs/PRODUCTION_READINESS.md`

Tests/evidence:
- Dependency audit report.
- Secret scan report.

Acceptance criteria:
- Zero blocking dependency vulnerabilities per release policy.
- Zero committed secrets in source, examples, or history.

Suggested human-run command:

```powershell
npm audit --omit=dev
```

### P1.4 Harden HTML rendering paths

Fix:
- Replace map tooltip HTML strings and inline event handlers with safe DOM or
  React-rendered content.
- Replace static dossier `dangerouslySetInnerHTML` with structured content, or
  add a strict sanitizer/content contract if HTML remains.

Primary files:
- `src/map/MapView.tsx`
- `src/ui/modals/ModalRoot.tsx`
- `tests/unit/contentContracts.test.ts`

Tests to add:
- Unit test: content fields are escaped or rejected when they contain unsafe
  HTML/event handlers.
- Regression test for dossier rendering.

Acceptance criteria:
- Future content externalization cannot turn these paths into XSS surfaces by
  accident.

### P1.5 Clarify Supabase environment boundaries

Fix:
- Replace concrete `.env.example` values with placeholders, or explicitly
  document that the included Supabase anon key targets a public demo backend.
- Add release checklist items for production Supabase URL, anon key, OAuth
  redirect URLs, RLS status, and monitoring.

Primary files:
- `.env.example`
- `README.md`
- `dev_docs/PRODUCTION_READINESS.md`

Tests/evidence:
- Manual deployment checklist confirms production environment variables.
- RLS verification evidence is attached to the release.

Acceptance criteria:
- Forks, previews, and production deploys cannot accidentally target the wrong
  Supabase project without operator awareness.

## Phase 6 - Auth, Privacy, And Data Isolation

### P0.14 Prove Supabase RLS and auth behavior

Fix:
- Add a repeatable RLS verification suite or documented Supabase SQL test
  harness.
- Cover session ownership, action-log ownership, insert/update/delete
  restrictions, and unauthenticated access.
- Cover expired sessions and cross-tab logout.

Primary files:
- `supabase/supabase.sql`
- `supabase/migrations/*`
- `src/services/authService.ts`
- `src/services/saveService.ts`
- New test or script under `tests/` or `scripts/`
- `dev_docs/PRODUCTION_READINESS.md`

Tests/evidence:
- User A cannot read user B sessions.
- User A cannot write user B sessions.
- User A cannot read user B action logs.
- User A cannot write user B action logs.
- Anonymous users cannot access private session data.

Acceptance criteria:
- No cross-user leakage is possible through client-accessible Supabase paths.

### P0.15 Define privacy, consent, and data retention for public players

Fix:
- Define what player data is collected, where it is stored, how long it is
  retained, and how a player requests deletion.
- If telemetry remains local-only, document that production operators cannot
  recover client diagnostics unless the player shares them.
- If production telemetry is added, implement consent, retention, and opt-out.

Primary files:
- `README.md`
- `dev_docs/PRODUCTION_READINESS.md`
- `src/utils/telemetry.ts`
- Auth/session UI files if consent is required in-product

Tests/evidence:
- Privacy notice review.
- Data deletion or account disconnect procedure.
- Consent/telemetry behavior test if telemetry ships.

Acceptance criteria:
- Public player data handling is clear before launch.

## Phase 7 - Content, Rights, And Public Trust

### P0.16 Add public content and asset-rights review

Fix:
- Create a release artifact that inventories:
  - images
  - video
  - audio
  - flags
  - map data
  - text excerpts
  - source-like claims
  - real-world conflict references
- Record license/provenance, usage permission, attribution requirement, and
  unresolved exceptions.

Primary files:
- `public/assets/README.md`
- `dev_docs/BUILD_PUBLIC_GAME.md`
- `dev_docs/PRODUCTION_READINESS.md`
- New release evidence file if needed

Tests/evidence:
- Asset inventory reviewed by owner.
- Content sensitivity review completed.
- Legal/rights exceptions resolved or explicitly waived.

Acceptance criteria:
- The public build can answer where every production asset and public claim
  came from.

### P1.6 Align public copy with product reality

Fix:
- Remove or rewrite any copy that implies:
  - mobile support if unsupported
  - leaderboard if deferred
  - online persistence if Supabase is not configured
  - production telemetry/support if not implemented
- Ensure landing, onboarding, session manager, and outcome copy use the same
  release truth.

Primary files:
- `index.html`
- `src/ui/modals/ModalRoot.tsx`
- `src/ui/modals/SessionManagerBody.tsx`
- `README.md`
- `dev_docs/*.md`

Tests/evidence:
- Content contract test for deferred feature labels where practical.
- Manual copy review.

Acceptance criteria:
- Players do not discover product limitations only after investing in a run.

## Phase 8 - Observability, Support, And Incident Response

### P0.17 Add production support and rollback runbooks

Fix:
- Add support procedures for:
  - failed entry
  - failed auth
  - failed save
  - failed resume
  - failed turn resolution
  - unavailable Supabase
  - broken media assets
  - CDN/script failure if CDNs remain
- Define what evidence support needs from the player.
- Define rollback trigger and owner.

Primary files:
- `dev_docs/PRODUCTION_READINESS.md`
- New support/runbook doc if needed
- `README.md`

Tests/evidence:
- Manual incident drill before launch.
- Staging rollback proof or hosting rollback procedure.

Acceptance criteria:
- A public incident has an owner, diagnosis path, and rollback path.

### P1.7 Add support-safe production diagnostics

Fix:
- Replace raw player-visible exception messages with stable error codes.
- Keep diagnostic detail out of the player UI.
- Add bounded telemetry/log events for critical failures if production telemetry
  is approved.

Primary files:
- `src/app/ErrorBoundary.tsx`
- `src/ui/layout/ActionBar.tsx`
- `src/services/saveService.ts`
- `src/utils/telemetry.ts`
- `dev_docs/PRODUCTION_READINESS.md`

Tests to add:
- Unit test: raw exception message is not rendered in production fallback.
- E2E test: forced failure shows support code and recovery action.

Acceptance criteria:
- Players get useful recovery information without seeing internal error text.

## Phase 9 - CI And Release Gates

### P0.18 Upgrade CI to production gate coverage

Fix:
- Keep current gates:
  - static asset validation
  - typecheck
  - lint
  - unit tests
  - build
  - E2E
- Add missing production gates:
  - production-preview E2E
  - browser matrix
  - accessibility scan
  - reduced-motion E2E
  - dependency audit
  - secret scan
  - bundle/performance budget
  - Supabase/RLS integration gate or documented staged manual gate

Primary files:
- `.github/workflows/ci.yml`
- `playwright.config.ts`
- `package.json`
- `dev_docs/PRODUCTION_READINESS.md`

Tests/evidence:
- CI summary shows all blocking gates run against the release candidate.
- No production release relies on stale historical evidence.

Acceptance criteria:
- The release branch cannot be called production-ready if a blocking gate is
  missing, skipped, stale, or failing.

### P0.19 Add a release evidence checklist

Fix:
- Add a checklist that records gate name, owner, date, command/report, result,
  and blocker status.
- Require current evidence for every release candidate.

Primary files:
- `dev_docs/PRODUCTION_READINESS.md`
- New release evidence template if needed

Required gates:
- Typecheck
- Lint
- Unit tests
- Static asset validation
- Build
- Production-preview E2E
- Cross-browser E2E
- Accessibility
- Reduced motion
- Dependency audit
- Secret scan
- Supabase RLS/auth
- Cloud save failure/recovery
- Performance budget
- Content/asset rights
- Privacy/data handling
- Support/rollback drill

Acceptance criteria:
- A reviewer can tell exactly which commit, environment, and artifact passed
  each production gate.

## Recommended Implementation Order

1. Fix docs and release target ambiguity.
2. Resolve `intel_layer_state` contract drift.
3. Make cloud save and action-log persistence atomic.
4. Add cloud save conflict/failure recovery.
5. Guard turn resolution and campaign completion UX.
6. Fix keyboard, focus, and reduced-motion gaps.
7. Add production-preview, cross-browser, and device matrix tests.
8. Harden external scripts, dependency scanning, secret scanning, and HTML
   rendering paths.
9. Prove Supabase RLS/auth and define privacy/data retention.
10. Complete content/asset-rights review.
11. Add support, diagnostics, rollback, and production evidence checklist.
12. Run all human verification gates on the exact release candidate.

## Human Verification Commands

Baseline gates already represented in scripts:

```powershell
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

Production-preview gate to add/use:

```powershell
npm run build
npm run preview
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
npm run test:e2e
```

Dependency audit gate:

```powershell
npm audit --omit=dev
```

Additional gates need scripts or documented manual procedures before full
public launch:

- Secret scan against the release branch and history.
- Accessibility scan against landing, active game, session manager, onboarding,
  action selection, event modal, dossier/encyclopedia modal, and outcome modal.
- Reduced-motion E2E.
- Cross-browser E2E.
- Supabase RLS/auth isolation proof.
- Cloud save failure and conflict recovery proof.
- Performance budget report.
- Asset rights and content sensitivity sign-off.
- Privacy/data retention sign-off.
- Support and rollback drill.

## Definition Of Done For Promotion

Promotion to `full_public_production_game` is done only when:

- Every P0 item in this file is fixed.
- Every P1 item is fixed or has an explicit signed release exception.
- CI and manual evidence are current for the exact release candidate.
- Production docs match runtime behavior.
- Player-facing copy does not promise deferred features.
- A new player can complete the full journey on every supported browser/device.
- Unsupported users are gated clearly before play.
- Save/resume/auth failure does not lose progress silently.
- Accessibility and reduced-motion gates pass.
- Security, dependency, secret, content-rights, privacy, and rollback evidence
  are attached to the release record.

Until then, the honest release label remains `controlled_desktop_demo` or
`controlled_desktop_demo_with_exceptions`, not `full_public_production_game`.
