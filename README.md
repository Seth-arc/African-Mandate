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
- `npm run validate:pages` — GitHub Pages deployment contract validation
- `npm test` — Unit tests
- `npm run test:e2e` — Playwright E2E player journey and release-support gate suite

## GitHub Pages deployment

The [`Deploy to GitHub Pages`](./.github/workflows/pages.yml) workflow builds the Vite application on every push to `main`, uploads only `dist/`, and deploys that artifact to the `github-pages` environment. The Vite base is `/` because the supported public URL is the custom domain `https://africanmandate.org/`.

Repository administrators must configure these settings once in **Settings → Pages**:

1. Set **Build and deployment → Source** to **GitHub Actions**.
2. Set **Custom domain** to `africanmandate.org`, save it, and enable **Enforce HTTPS** when GitHub makes that option available.

GitHub ignores repository `CNAME` files for custom Actions workflows; the custom domain must remain configured in the Pages settings. Do not switch the Vite base to `/African-Mandate/` while source files use root-relative `/assets/...` and `/img/...` URLs.

Use `npm run validate:pages` to verify the repository-side deployment contract before pushing.

## Project root

The repo root contains the landing page (`index.html`), design docs, and JSON content. The game reads data from `src/data/` (copy from root as described in BUILD_STEPS.md).
