# Root Redirect Handoff (Prepared, Not Activated)

Purpose
- Define the exact handoff steps to make the React app in `game/` the default entrypoint.
- Keep the redirect unapplied until explicit release sign-off.

Current Status
- `game/` is the first-playable source of truth.
- Root `index.html` is still a legacy landing surface and has not been redirected.

Activation Trigger
- Apply this handoff only after explicit sign-off that Phase 5 is accepted for player-facing release.

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
- [ ] Product sign-off on first-playable quality.
- [ ] Full regression commands green (`typecheck`, tests, build).
- [ ] Manual smoke path confirmed on release environment.
- [ ] Redirect/root handoff applied in deployment config.
