# Sahel Arena — Game build

Turn-based strategy game: you play the AU Special Envoy in the Sahel. This folder is the Vite + React + TypeScript application.

## Quick start

```bash
cd game
npm install
npm run dev
```

Then open the URL shown (e.g. http://localhost:5174).

## Step-by-step build

See **[BUILD_STEPS.md](./BUILD_STEPS.md)** for the full process from scaffold through engine, map, UI, and release.

## Commands

- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run typecheck` — TypeScript check
- `npm test` — Unit tests

## Project root

The repo root contains the landing page (`index.html`), design docs, and JSON content. The game reads data from `src/data/` (copy from root as described in BUILD_STEPS.md).
