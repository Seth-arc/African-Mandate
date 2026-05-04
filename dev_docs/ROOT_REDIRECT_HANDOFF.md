# Root Redirect Handoff (Prepared, Not Activated)

Purpose
- Define the exact handoff steps to make the React app in `game/` the default entrypoint.
- Keep the redirect unapplied until explicit release sign-off.

Current Status
- The current release position is the v0.1 public web release for desktop and laptop browsers, served through the root landing page plus embedded React game.
- Root `index.html` remains the public entry surface because it owns the release-support gate, cinematic entry, and React game mount.

Activation Trigger
- Apply this handoff only after explicit sign-off that a different production entry surface is accepted and the canonical support contract in `dev_docs/PRODUCTION_READINESS.md` is updated with passing evidence.

Handoff Steps (On Sign-Off)
1. Build the React app:
   - `cd game`
   - `npm run build`
2. Publish `game/dist` as the primary web root in hosting/deployment.
3. Replace root entrypoint behavior with a direct handoff:
   - Option A (preferred): Serve `game/dist/index.html` as site root.
   - Option B: Keep root `index.html` and redirect immediately to `/game/` (or deployed React path).
4. Run smoke checks on:
   - fresh load to mission layout
   - mission brief modal
   - action modal flow
   - act briefing transition
   - campaign outcome modal

Rollback Plan
- Restore previous root `index.html` routing behavior.
- Revert deployment target from React root to legacy root.

Sign-Off Checklist
- [ ] Product sign-off on production public game quality.
- [ ] Full regression commands green (`typecheck`, tests, build).
- [ ] Manual smoke path confirmed on release environment.
- [ ] Release-support matrix updated for the new entry surface.
- [ ] Accessibility certification complete.
- [ ] Durable telemetry pipeline accepted or explicitly waived if the new surface changes telemetry support.
- [ ] Redirect/root handoff applied in deployment config.
