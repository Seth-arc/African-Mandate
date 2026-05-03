# AI Co-Development Plan (Remaining Work to Public Release)

This plan only tracks implementation that is still needed to make `game/` deployable and suitable for public use.  
Baseline first-playable work (runtime data, map loop, actions, intel, dialogue, mission context, act transitions, endings, responsive polish) is treated as complete per `progress.md`.

## Target Outcome
- Desktop-only public demo through the current root landing page until production public game sign-off.
- Authenticated player sessions with save/resume.
- Stable, test-backed, accessible, and performance-acceptable gameplay loop.
- Release operations and legal/privacy requirements in place before production public game positioning.

## Remaining Scope (In)
- Supabase auth and persistent session storage.
- Save/resume UX and user profile/session management surfaces.
- Integration/E2E/cross-browser QA for critical player flows.
- Accessibility hardening and performance optimization.
- Privacy-safe telemetry and public-release documentation.
- Staging/prod deployment pipeline and rollback-ready release process.

## Out of Scope (Until Explicitly Re-added)
- Full cinematic cutscene playback.
- Timer/leaderboard expansion beyond current first-playable behavior unless made mechanically required.
- Major post-launch feature expansion (new modes, achievements, meta-progression).

## Phase R1: Persistence and Auth (Critical Path)
[ ] Replace placeholder Supabase env helper with real client initialization and typed access layer in `src/services/supabaseClient.ts`.  
[ ] Implement auth flow (at minimum: guest + sign-in provider path) and auth session state integration.  
[ ] Implement save service for session snapshots + action log persistence (`after action` and `end turn`).  
[ ] Implement resume/load flow with session listing and safe restore into `gameStore`.  
[ ] Add DB migration workflow from canonical schema source (`supabase.sql`) with versioned migration files.  
[ ] Enforce RLS policy assumptions in app behavior (no cross-user session visibility).  
[ ] Add unit/integration coverage for serialization, save/load round-trip, and auth guard behavior.

Review gate:
- A user can sign in, play, close, and resume the exact same campaign state.

## Phase R2: Runtime Completeness and Balance for Public Play
[ ] Audit all critical game surfaces for runtime completeness under loaded sessions (new + resumed): map, mission brief, action flow, intel, dialogue, status report, campaign outcome.  
[ ] Validate event/intel runtime behavior in long sessions (deadlines, trigger chains, feed evolution, log visibility) using authored `events.yaml` content.  
[ ] Run balance pass for win/loss outcomes across multiple play styles and ensure no obvious unwinnable/degenerate paths.  
[ ] Tighten failure messaging and recovery UX for persistence/network/runtime data errors (no silent failure).  
[ ] Lock release baseline rules and thresholds against docs (`WIN_LOSS_SCORING_SPEC.md`, `REQUIRED_KEYS_AND_CONSTRAINTS.md`).

Review gate:
- Full 20-turn campaigns are stable, outcomes are credible, and authored systems behave consistently in resumed sessions.

## Phase R3: Test and QA Expansion
[ ] Add integration tests for full stateful flows (action -> save -> reload -> continue -> outcome).  
[ ] Add Playwright E2E coverage: start campaign.  
[ ] Add Playwright E2E coverage: execute full action flow.  
[ ] Add Playwright E2E coverage: end-turn progression.  
[ ] Add Playwright E2E coverage: act briefing display.  
[ ] Add Playwright E2E coverage: campaign outcome and restart.  
[ ] Add Playwright E2E coverage: save/resume round-trip.  
[ ] Add cross-browser smoke matrix (Chromium, Firefox, WebKit/Safari-targeted).  
[ ] Add regression checklist for manual QA and require it at release candidate time.  
[ ] Add CI step for test tiers (unit, integration, e2e smoke).

Review gate:
- Critical paths pass automatically and manually on release candidate builds.

## Phase R4: Accessibility and Performance Hardening
[ ] Implement keyboard-first modal and action flow navigation (focus trap, escape behavior, visible focus).  
[ ] Add/verify ARIA labels and semantic landmarks for primary controls and modals.  
[ ] Add reduced-motion mode handling for modal/layout animations.  
[ ] Address build-size warning with chunking/lazy loading strategy where appropriate.  
[ ] Profile and optimize map/panel rendering on mid-tier laptop targets.  
[ ] Add explicit loading/error/empty state consistency pass across all player-facing surfaces.

Review gate:
- Interaction remains smooth and accessible without mouse-heavy assumptions.

## Phase R5: Public Release Compliance and Ops
[ ] Implement privacy-safe telemetry pipeline (opt-in/opt-out behavior, minimal event set, no sensitive payloads).  
[ ] Add public-facing docs: release notes template, privacy policy link target, fictionalization/sensitivity disclaimer handling in UI/docs.  
[ ] Add `SECURITY.md` (public disclosure policy).  
[ ] Add `LICENSE` (public usage terms).  
[ ] Add `CODE_OF_CONDUCT.md` if public collaboration/contributions are enabled.  
[ ] Establish incident/rollback playbook for launch window.

Review gate:
- Release package satisfies privacy, disclosure, and operational readiness requirements.

## Phase R6: Deployment and Entry-Point Handoff
[ ] Stand up staging and production environment configs (including Supabase env wiring).  
[ ] Add CI/CD workflow for build/test/deploy with environment separation.  
[ ] Execute staging sign-off using full regression checklist.  
[ ] Activate root handoff from legacy landing to React app per `ROOT_REDIRECT_HANDOFF.md` only after sign-off.  
[ ] Verify post-deploy smoke on live environment and record release checklist results.

Review gate:
- Public URL serves the React game as primary experience with rollback path ready.

## Validation Standard Per Slice
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- Targeted browser smoke of touched user path

For release-candidate slices:
- Include persistence/auth validation on staging environment.

## Remaining File Ownership Map (Likely High-Touch)
- `game/src/services/supabaseClient.ts`
- `game/src/state/gameStore.ts`
- `game/src/state/types.ts`
- `game/src/state/initState.ts`
- `game/src/ui/layout/GameLayout.tsx`
- `game/src/ui/modals/ModalRoot.tsx`
- `game/src/ui/panels/StatusReport`/related status surfaces
- `game/src/styles/layout.css`
- `game/src/styles/map.css`
- `game/tests/` (new integration/e2e coverage)
- `game/dev_docs/ROOT_REDIRECT_HANDOFF.md`
- deployment/CI files (`.github/workflows/*`) when added

## Open Decisions Still Needed
- Auth mode for launch: guest-only + optional sign-in, or mandatory sign-in.
- Save policy for launch: autosave-only, manual save, or both.
- Telemetry posture at launch: local QA-only, default off, explicit opt-in in the session preferences.
- Public root behavior timing: immediate redirect vs staged rollout.
