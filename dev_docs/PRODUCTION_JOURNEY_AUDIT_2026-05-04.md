# Production Journey Audit - 2026-05-04

## Verdict

African Mandate is not ready for full production public deployment as a complete
public game. The current codebase is closer to a controlled desktop public demo:
the deterministic gameplay loop, static content checks, local/cloud save
foundations, and a broad Chromium player journey test exist, but several
production gates remain ambiguous, untested, or contradictory across code and
docs.

This audit did not execute commands. Repository instructions reserve test,
build, npm, docker, and deployment execution for the human operator. The
verification commands at the end define the required reproducible gate evidence.

## Scope Reviewed

- `README.md`
- `BUILD_STEPS.md`
- `dev_docs/PRODUCTION_READINESS.md`
- `dev_docs/BUILD_PUBLIC_GAME.md`
- `dev_docs/FULL_GAME_SYSTEM_DESIGN.md`
- `dev_docs/GAME_UI_UX_SPECIFICATION.md`
- `dev_docs/WIN_LOSS_SCORING_SPEC.md`
- `package.json`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.env.example`
- `index.html`
- `src/app/App.tsx`
- `src/app/ErrorBoundary.tsx`
- `src/ui/layout/GameLayout.tsx`
- `src/ui/layout/ActionBar.tsx`
- `src/ui/modals/ModalRoot.tsx`
- `src/ui/modals/SessionManagerBody.tsx`
- `src/ui/panels/IntelFeed.tsx`
- `src/map/MapView.tsx`
- `src/state/gameStore.ts`
- `src/state/types.ts`
- `src/state/initState.ts`
- `src/state/gameSetup.ts`
- `src/state/sessionStore.ts`
- `src/state/sessionPreferences.ts`
- `src/systems/actionResolver.ts`
- `src/systems/turnEngine.ts`
- `src/systems/validation.ts`
- `src/services/saveService.ts`
- `src/services/authService.ts`
- `src/services/supabaseClient.ts`
- `src/utils/telemetry.ts`
- `src/styles/globals.css`
- `supabase/supabase.sql`
- `supabase/migrations/202603080001_phase_r1_persistence_auth.sql`
- `scripts/validate-static-assets.mjs`
- `tests/unit/contentAssets.test.ts`
- `tests/unit/contentContracts.test.ts`
- `tests/unit/actionResolver.test.ts`
- `tests/unit/turnEngine.test.ts`
- `tests/e2e/player-journey.spec.ts`

## Severity Model

- `BLOCKER`: must be resolved or explicitly accepted with a dated release
  exception before any production public deployment.
- `HIGH`: should be resolved before a public demo, or documented as a known
  limitation with owner, user impact, and rollback plan.
- `MEDIUM`: material quality, maintainability, support, or trust risk.
- `ADVISORY`: polish or hardening that should be tracked but does not alone
  block a controlled demo.

## Blocking Findings

### 1. Launch posture is not production-public; it is desktop-demo

Evidence:
- `README.md` describes the project as a desktop-only cinematic strategy game.
- `dev_docs/PRODUCTION_READINESS.md` states it is not production deployed.
- `dev_docs/BUILD_PUBLIC_GAME.md` explicitly says to build the public game
  while preserving the existing desktop-only demo.
- `dev_docs/GAME_UI_UX_SPECIFICATION.md` says mobile users should see a
  desktop-only gate.

Risk:
- A player-facing production launch has a larger obligation than the current
  stated target: cross-browser evidence, durable save/recovery, clear auth
  behavior, accessible interaction parity, deployment observability, content
  review, and support-ready error states.

Required closure:
- Decide and publish one of two release targets:
  - `controlled_desktop_demo`
  - `full_public_production_game`
- Tie CI, docs, release notes, and user-facing copy to that target.

### 2. Canonical docs contradict runtime behavior

Evidence:
- `BUILD_STEPS.md` still says the turn engine is stubbed and should be fleshed
  out, while `src/systems/turnEngine.ts` and `tests/unit/turnEngine.test.ts`
  show implemented behavior.
- `BUILD_STEPS.md` still asks for save service implementation, while
  `src/services/saveService.ts` and Supabase schema files already exist.
- `dev_docs/GAME_UI_UX_SPECIFICATION.md` says `index.html` is a landing page
  that should navigate to `game.html`; the actual app mounts the React game
  from `index.html`.
- `dev_docs/GAME_UI_UX_SPECIFICATION.md` and other docs still describe a
  leaderboard as if it exists, while `src/ui/modals/ModalRoot.tsx` renders
  leaderboard as deferred.

Risk:
- Production operators, reviewers, and future agents cannot reliably determine
  what is canonical. This directly affects release gating and user journey
  support.

Required closure:
- Mark outdated build-plan docs as historical, or update them to match the
  current app.
- Add one canonical production release checklist that references the current
  runtime, not the older scaffold plan.

### 3. Runtime save state omits the documented `intel_layer_state`

Evidence:
- `dev_docs/FULL_GAME_SYSTEM_DESIGN.md` requires `intel_layer_state`.
- `supabase/supabase.sql` defines `intel_layer_state` with schema constraints.
- `src/state/types.ts` and `src/services/saveService.ts` do not model or write
  it.

Risk:
- The database contract and design contract have drifted from runtime state.
  Any future map/intel overlay, replay, resume, analytics, or leaderboard logic
  depending on `intel_layer_state` will read defaults rather than player truth.

Required closure:
- Either remove `intel_layer_state` from the production contract, or add it to
  the runtime type, initial state, validators, local save snapshot, cloud save
  payload, load path, migration compatibility notes, and tests.

### 4. Cloud save action-log synchronization is not atomic

Evidence:
- `src/services/saveService.ts` upserts `game_sessions`, deletes prior
  `actions_log` rows, then inserts the current action log in separate client
  operations.

Risk:
- A network or Supabase failure between those operations can leave the remote
  snapshot and remote action log inconsistent. Resume may still work from the
  snapshot, but audit, replay, progress reconstruction, future leaderboard
  features, or support tooling can see partial truth.

Required closure:
- Move session plus action-log persistence into a single database RPC or other
  transactional server-side operation.
- Add an integration test that fails if a partial action-log write can be
  observed after a simulated failure.

### 5. Release gates do not yet prove a production user journey

Evidence:
- `playwright.config.ts` runs one Chromium desktop project against the dev
  server.
- `tests/e2e/player-journey.spec.ts` covers one broad player journey and one
  mobile gate, but not production preview, non-Chromium browsers, real auth,
  cloud save/RLS, reduced motion, accessibility scan, CDN failure, or recovery
  from save/turn failures.
- `.github/workflows/ci.yml` runs static assets, typecheck, lint, unit tests,
  build, Chromium install, and E2E. It does not run a dependency audit, secret
  scan, accessibility audit, bundle/performance budget, cross-browser tests, or
  Supabase/RLS integration checks.

Risk:
- The current CI can pass while a real production player still fails to enter,
  save, resume, recover, complete, or use assistive technology.

Required closure:
- Add a production-preview E2E path.
- Add browser matrix coverage or explicitly scope release support to Chromium.
- Add accessibility and reduced-motion gates.
- Add Supabase auth/save/RLS integration verification.
- Add dependency/secret/performance gates.

## High Findings

### 6. End-turn failures have no in-game recovery path

Evidence:
- `src/ui/layout/ActionBar.tsx` calls `advanceTurn(state)` directly inside the
  click handler before opening the transition modal.

Risk:
- If turn resolution throws, the player can be left with no retry or degraded
  in-game error state. React error boundaries do not reliably catch errors
  thrown from event handlers.

Required closure:
- Wrap turn resolution in an explicit guarded path.
- Render an in-game retry state that preserves the current save snapshot and
  exposes a support-safe error code.

### 7. Campaign-complete action copy and disabled state conflict

Evidence:
- `src/ui/layout/ActionBar.tsx` computes an outcome-opening branch when
  `endingType` exists, but the End Turn button is disabled when `endingType`
  exists.

Risk:
- A completed campaign can present copy telling the player to open the outcome
  report through a disabled control, depending on which panel is visible.

Required closure:
- Make the completed-campaign action reachable, or remove the unreachable
  branch and ensure a single clear outcome entry point.

### 8. Leaderboard is product-facing in docs but deferred in runtime

Evidence:
- Design and build docs describe leaderboard access and scoring.
- `src/ui/modals/ModalRoot.tsx` says leaderboard is deferred to a future
  backend-backed release.

Risk:
- Players and reviewers may expect competitive or public scoring that does not
  exist. This also affects privacy, abuse handling, and save identity review.

Required closure:
- Either remove leaderboard promises from production docs and copy, or build
  the full backend-backed feature with moderation, privacy, RLS, and tests.

### 9. Mobile and tablet support boundary is ambiguous

Evidence:
- Docs describe a desktop-only experience.
- The gate in `index.html` appears focused on phone-like width and coarse
  pointer conditions.
- The E2E mobile gate covers an iPhone profile, not tablets or hybrid devices.

Risk:
- Some unsupported touch or tablet users can reach the game without a supported
  interaction model, creating broken first-session experiences.

Required closure:
- Define the exact supported viewport, pointer, and browser matrix.
- Add gate tests for iPad/tablet/hybrid/laptop touch cases.

### 10. Landing page depends on external CDNs without production fallback

Evidence:
- `index.html` loads GSAP, ScrollTrigger, and Lenis from external CDNs before
  the app journey.

Risk:
- If those scripts are blocked, slow, compromised, or changed, the first-play
  landing flow can break outside the built asset validation gate.

Required closure:
- Vendor and pin these assets, or add integrity, fallback behavior, and a test
  that the player can still enter the game if external scripts fail.

### 11. Reduced-motion compliance does not cover the full first-play journey

Evidence:
- `src/styles/globals.css` clamps CSS transitions and animations for
  `prefers-reduced-motion`.
- `index.html` still orchestrates landing animations, smooth scrolling,
  cinematic video flow, and audio/video interaction in plain script.

Risk:
- Motion-sensitive users can be exposed to the most animated part of the
  experience before React-level styles or preferences meaningfully protect
  them.

Required closure:
- Add a JavaScript-level reduced-motion branch in `index.html`.
- Add E2E evidence that intro transitions, smooth scroll, video autoplay
  prompts, and game entry remain usable under reduced motion.

### 12. Accessibility parity gaps remain in core interaction surfaces

Evidence:
- `src/map/MapView.tsx` creates interactive intel markers with keyboard
  disabled.
- `src/ui/panels/IntelFeed.tsx` uses `role="button"` list items and only
  handles Enter, not Space.
- Plain HTML landing modals support Escape and close buttons, but do not show
  the same focus-trap/focus-return rigor as the React modal system.

Risk:
- Keyboard and assistive-technology users do not have equal confidence that
  every visible interactive route is operable and understandable.

Required closure:
- Prefer native buttons for feed actions.
- Either make map markers keyboard-operable or clearly expose an equivalent
  synchronized keyboard path.
- Add axe or equivalent accessibility checks for landing, active game, session
  manager, onboarding, action selection, event modal, and outcome modal.

### 13. Raw error messages are player-visible

Evidence:
- `src/app/ErrorBoundary.tsx` renders `error.message` in the fallback UI.

Risk:
- Internal implementation details can leak into the player experience. Even
  non-sensitive stack-adjacent messages reduce trust in production.

Required closure:
- Replace raw player-facing errors with stable, support-safe error codes and
  plain recovery instructions.
- Keep diagnostic detail in telemetry/logging only when enabled and reviewed.

### 14. Auth and cloud-save journeys are not production-proven

Evidence:
- `src/services/authService.ts`, `src/services/supabaseClient.ts`, and
  `src/services/saveService.ts` contain the auth/save implementation.
- Current E2E coverage stubs browser media and validates local journey flow,
  but not Google OAuth, Supabase session restore, RLS enforcement, cross-tab
  logout, expired sessions, network loss during save, or cloud/local conflict
  resolution.

Risk:
- The highest-trust player journeys, save, resume, identity, and recovery, can
  fail after deployment without CI evidence.

Required closure:
- Add an integration or staged manual gate for OAuth/session restore.
- Add RLS tests proving a user cannot read or write another user's sessions or
  action logs.
- Add cloud-save failure and conflict-resolution E2E coverage.

## Medium Findings

### 15. HTML string patterns should be hardened before externalizing content

Evidence:
- `src/map/MapView.tsx` constructs tooltip HTML with an inline `onerror`
  handler.
- `src/ui/modals/ModalRoot.tsx` renders static dossier HTML with
  `dangerouslySetInnerHTML`.

Risk:
- The immediate XSS risk appears limited because the data is static and
  repository-controlled, but these patterns become unsafe if future content
  moves to JSON, CMS, Supabase, or remote localization.

Required closure:
- Replace tooltip HTML strings with DOM nodes or safely escaped rendering.
- Add a content contract that dossier HTML is static, sanitized, or converted
  to structured React content.

### 16. Public content, source, and asset-rights review is not represented as a gate

Evidence:
- The game uses real-world conflict, governance, and crisis subject matter.
- `public/assets/README.md` and asset tests validate presence, not license,
  provenance, or rights clearance.
- `dev_docs/BUILD_PUBLIC_GAME.md` includes general ethics and sensitivity
  notes, but no final review artifact.

Risk:
- A public launch can expose the project to reputational, legal, or trust
  failure even if the software behaves correctly.

Required closure:
- Add a source/rights/content review checklist with approver, date, asset
  inventory, licensing/provenance status, and unresolved exceptions.

### 17. Telemetry is intentionally local-only, but production observability is undefined

Evidence:
- `src/utils/telemetry.ts` writes local QA telemetry when enabled.
- Production docs do not define a user-safe deployed telemetry, logging,
  support, or incident path.

Risk:
- Operators cannot diagnose production player failures without relying on user
  screenshots or browser console reports.

Required closure:
- Define whether production telemetry is disabled by policy or implemented
  with explicit consent and retention.
- Add a support-safe event model for failed entry, failed save, failed resume,
  failed turn resolution, and outcome completion.

### 18. `.env.example` points to a concrete Supabase project

Evidence:
- `.env.example` includes a Supabase URL and anon key.

Risk:
- Supabase anon keys are browser-public by design, but a concrete project in
  example configuration can cause forks, previews, or accidental deployments to
  target the same backend unless the intended boundary is explicitly stated.

Required closure:
- Either replace with placeholders, or document that this is an intentionally
  public demo backend with verified RLS and monitoring.

## Player Journey Risk Map

### Entry and Landing

Current strengths:
- The landing page has a clear cinematic entry path.
- Desktop-only posture is visible in docs and tested for one phone profile.

Open risks:
- External CDN dependency can break the first screen.
- Reduced-motion behavior is incomplete for the pre-React experience.
- Tablet and hybrid support boundaries are not fully specified or tested.
- Plain HTML modal focus management is weaker than the React modal system.

### Session Start, Auth, Save, and Resume

Current strengths:
- Local save, cloud save, Supabase client setup, and session manager UI exist.
- RLS policies are present in the Supabase schema.

Open risks:
- Cloud session and action-log writes are not atomic.
- Runtime state omits `intel_layer_state`.
- OAuth/session restore/cloud conflict journeys lack automated evidence.
- Local storage failure and cloud save failure need stronger preflight and
  recovery affordances.

### Gameplay Loop

Current strengths:
- Deterministic action resolution and turn progression are implemented.
- Unit tests cover action resolution and turn engine behavior.
- State validation exists.

Open risks:
- Turn-resolution exceptions do not have a first-class in-game recovery path.
- Campaign-complete action affordances are internally inconsistent.
- Keyboard parity gaps remain for some intel/map interactions.

### Evidence, Trust, and Outcome

Current strengths:
- The game has rich dossier, encyclopedia, briefing, and outcome surfaces.
- Scoring and win/loss documentation exists.

Open risks:
- Leaderboard status is contradictory.
- Dossier HTML and map tooltip HTML need a hardened rendering contract.
- Content/source/rights review is not represented as a concrete release gate.
- Raw error messages are still visible to players.

### Deployment and Operations

Current strengths:
- CI runs build, lint, typecheck, static asset validation, unit tests, and one
  Chromium E2E journey.

Open risks:
- No production-preview E2E gate.
- No explicit cross-browser, accessibility, dependency audit, secret scan,
  performance budget, Supabase/RLS integration, or observability gate.
- Docs do not yet define production support, incident, rollback, or player data
  handling responsibilities.

## Required Human Verification Commands

Run these before any release candidate is considered current. A pass means the
command exits successfully and any generated reports show no blocker findings.

```powershell
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

Production-preview E2E should also be added and run. If implemented with the
existing Playwright setup, the intended gate shape is:

```powershell
npm run build
npm run preview
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
$env:PLAYWRIGHT_SKIP_WEB_SERVER="1"
npm run test:e2e
```

Additional production gates that should exist before full public launch:

```powershell
npm audit --omit=dev
```

Required non-command evidence:
- Supabase RLS proof that user A cannot read or write user B sessions or action
  logs.
- OAuth/session restore proof in the deployed environment.
- Accessibility report for landing, active game, session manager, onboarding,
  action selection, event modal, dossier/encyclopedia modal, and outcome modal.
- Reduced-motion proof for landing plus active gameplay.
- Asset rights/source review artifact.
- Rollback and support runbook for failed save, failed resume, failed turn,
  failed auth, and unavailable Supabase.

## Release Decision

- Full public production game: `NO-GO`.
- Controlled desktop public demo: `CONDITIONAL NO-GO` until the blocking
  findings above are fixed or explicitly accepted with a dated release
  exception, and the human-run verification commands produce current evidence.

Do not mark this audit closed based on historical CI, previous local runs, or
stale docs. Current release evidence must be generated from the candidate that
would actually be deployed.
