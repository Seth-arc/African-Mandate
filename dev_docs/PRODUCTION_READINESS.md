# Production Readiness

This document is the current launch-readiness contract for African Mandate: Sahel Arena.

## Launch Scope

- Current launch posture: desktop-only public demo.
- Audience: public desktop/laptop players, testers, educators, and stakeholders evaluating the game loop.
- Data posture: synthetic scenario content, local QA-only telemetry, and optional Supabase-backed authenticated saves.
- Not in scope for this launch: certified mobile play, durable production analytics, multiplayer, payment, native app packaging, or expanded geography.

## Browser Support

- Certified gate: Chromium desktop through `npm run test:e2e`.
- Target support: current stable Chrome and Edge on desktop/laptop.
- Best-effort support: current Firefox and Safari desktop. These require manual QA until non-Chromium Playwright projects are added.
- Unsupported: legacy browsers, embedded webviews, IE mode, and browsers with JavaScript, media playback, or local storage disabled.

## Desktop And Mobile Support

- Desktop/laptop: supported for keyboard and pointer input at common desktop widths.
- Phone-sized touch devices: intentionally blocked by the landing-page mobile gate.
- Tablets and hybrid touch devices: not certified for production play; use desktop mode only during QA.
- Mobile launch remains blocked until touch layout, performance, accessibility, and mobile E2E gates are added and pass.

## Save Behavior

- Guest play stores saves in the current browser through local storage. Clearing site data, private browsing cleanup, or changing browsers can remove guest saves.
- Authenticated play uses Google OAuth through Supabase and stores cloud saves under the authenticated user.
- Autosave runs after important state changes including actions, dialogue, intel interactions, and end-turn resolution when autosave is enabled.
- Manual save is available from the session menu.
- A failed save shows an in-game error banner with retry. The game state remains active; the player should retry before closing the tab.
- `VITE_SUPABASE_ANON_KEY` is intentionally public demo infrastructure. It is safe to expose to the browser when Supabase Auth and row-level security policies enforce access. Service-role keys and backend credentials must never be placed in `VITE_*` variables.

## Known Limitations

- Only the Chromium E2E project is automated today.
- Durable production analytics are not enabled; telemetry is local QA-only and opt-in.
- Cutscenes currently reuse shipped video and still assets until the final dedicated media set is produced.
- Mobile play is blocked, not degraded.
- Cloud saves depend on Supabase availability and correct environment configuration.
- Guest saves are browser-local and cannot be recovered after local storage deletion.

## Recovery Steps

- Missing or empty static asset: run `npm run validate:assets`, restore the referenced file under `public/`, or update the source/content reference to a shipped asset.
- Broken content reference: run `npm test -- --run tests/unit/contentContracts.test.ts` and update the JSON, localization key, actor/action/dialogue reference, or test contract together.
- Supabase auth or cloud save failure: confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, verify Supabase project health, verify Auth providers, and retry the save from the in-game banner.
- Guest save issue: keep the tab open, retry manual save, and avoid clearing site data. If local storage was cleared, the guest save cannot be restored.
- Failed deployment smoke: run `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build`, and `npm run test:e2e`; redeploy only after the failing gate is fixed.
- Bad release: roll back to the previous known-good deployment artifact and keep the current failing build out of production until the gate failure is reproduced and fixed.

## Release Gate

Before launch or redeploy, run:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

`npm run build` includes `npm run validate:assets`, and CI also runs the asset validator as an explicit pre-build gate.
