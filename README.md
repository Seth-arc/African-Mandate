# Sahel Arena — Game build

Turn-based strategy game: you play the AU Special Envoy in the Sahel. This repo is the Vite + React 19 + TypeScript application.

## Launch scope

Current positioning is a **desktop-only public demo**, not a fully certified production public game. Phone-sized touch devices are blocked by the landing-page mobile gate until the touch layout, performance, and accessibility pass are certified. Demo data is synthetic, and runtime telemetry is local QA-only behind the in-game telemetry opt-in.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL shown (e.g. http://localhost:5174).

## Step-by-step build

See **[BUILD_STEPS.md](./BUILD_STEPS.md)** for the full process from scaffold through engine, map, UI, and release.
See **[Production Readiness](./dev_docs/PRODUCTION_READINESS.md)** for launch scope, browser/device support, save behavior, known limitations, and recovery steps.

## Commands

- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run typecheck` — TypeScript check
- `npm run validate:assets` — Static asset reference validation
- `npm test` — Unit tests
- `npm run test:e2e` — Playwright E2E player journey and mobile gate suite

## Project root

The repo root contains the landing page (`index.html`), design docs, and JSON content. The game reads data from `src/data/` (copy from root as described in BUILD_STEPS.md).
