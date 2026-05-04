# Sahel Arena — Game build

Turn-based strategy game: you play the AU Special Envoy in the Sahel. This repo is the Vite + React 19 + TypeScript application.

## Launch scope

The supported release target is the **v0.1 public web release for desktop and laptop browsers**. The production support contract, including supported browsers, device classes, storage, media, and network assumptions, lives in **[Production Readiness](./dev_docs/PRODUCTION_READINESS.md#release-support-matrix)** and is the single source of truth.

Phone, tablet, touch-only, undersized-window, unsupported-browser, offline, and storage-disabled journeys are gated before a campaign can start. Runtime telemetry remains local QA-only behind the in-game telemetry opt-in.

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
- `npm run test:e2e` — Playwright E2E player journey and release-support gate suite

## Project root

The repo root contains the landing page (`index.html`), design docs, and JSON content. The game reads data from `src/data/` (copy from root as described in BUILD_STEPS.md).
