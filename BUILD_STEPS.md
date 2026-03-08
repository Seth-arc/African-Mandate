# African Mandate: Sahel Arena — Step-by-step build

This folder is the **actual game build**: Vite + React 18 + TypeScript + Zustand. The repo root holds the landing page (`index.html`), design docs, and content data. This guide walks you through the build from where you are now.

---

## Step 1 — Prerequisites

- **Node.js** v18+ (v22 recommended) and npm.
- Terminal in the project root or in `game/`.

From the repo root:

```bash
cd game
npm install
```

This installs React, Zustand, React-Leaflet, Zod, Vitest, Playwright, ESLint, Prettier, and the Vite React plugin. If any dependency fails, fix the Node/npm version and run again.

---

## Step 2 — Run the app

```bash
npm run dev
```

Vite starts the dev server (default port 5174). Open the URL in the browser. You should see:

- **African Mandate — Sahel Arena** header
- Turn 1 / 20, Actions left: 3
- Five metric cards (Stability, Insurgency, Civilian support, Global legitimacy, Regional synergy) with values from `game_config.json`
- Resources line (budget, political capital, personnel, intel, time)

This confirms the scaffold and state wiring.

---

## Step 3 — Typecheck and build

```bash
npm run typecheck
npm run build
```

- `typecheck` runs `tsc --noEmit` (strict + noUncheckedIndexedAccess). Fix any type errors before moving on.
- `build` produces output in `dist/`. Run `npm run preview` to serve the production build locally.

---

## Step 4 — Copy the rest of the data (optional for next phases)

The game currently loads only `src/data/game_config.json`. To implement actions, territories, intel, and dialogues, copy the JSON files from the **repo root** into `game/src/data/`:

| Copy from (repo root) | To (game/src/data/) |
|------------------------|----------------------|
| `territories.json`     | `territories.json`   |
| `zones.json`           | `zones.json`         |
| `actions.json`         | `actions.json`       |
| `actors.json`          | `actors.json`        |
| `dialogues.json`       | `dialogues.json`     |
| `intel_reports.json`   | `intel_reports.json` |
| `localization_en.json` | `localization_en.json` |

Copy the GeoJSON map into `game/public/` so the map can load it:

- Repo: `context_files/sahel_countries.geojson` → `game/public/assets/sahel_countries.geojson`

All game values must come from these data files (see root `AGENTS.md` and `REQUIRED_KEYS_AND_CONSTRAINTS.md`).

---

## Step 5 — Implement the core engine (Phase 3)

1. **Extend `src/state/types.ts`**  
   Add types for territories, zones, actors, intel (aligned with the JSON and `context_files` schemas).

2. **Implement `src/systems/actionResolver.ts`**  
   Validate action (costs, cooldowns, intel gate, targets), pay costs, apply effects. Pure functions; throw `GameError` on invalid input.

3. **Implement `src/systems/turnEngine.ts`**  
   Already stubbed. Flesh out: reset `actions_remaining`, apply AI director rules, resolve delayed effects, evaluate win/fail.

4. **Add `src/systems/validation.ts`**  
   Input validation and bounds (metrics 0–100, resources ≥ 0, turn in range).

5. **Unit tests**  
   In `tests/unit/`, test action resolution and turn advancement with values from the data files. No mocking the engine.

---

## Step 6 — Add the map (Phase 4 + 5)

1. In `src/map/MapView.tsx`, use React-Leaflet and load `public/assets/sahel_countries.geojson`.
2. Drive markers and layers from territory/zone state in the store.
3. Style using `src/styles/tokens.css` and the reference prototype (`context_files/gameplay-interface-final.html`).

---

## Step 7 — Rebuild the UI (Phase 5)

Follow the priority order in the root `BUILD_PUBLIC_GAME.md`:

1. Layout skeleton (header, sidebars, center map)
2. Resource and metrics panels (use `ResourcePanel` as reference pattern; handle loading, empty, populated)
3. Map and territory details
4. Action flow (select → configure → confirm)
5. Intel feed + modal
6. Actor dialogue + modal
7. Status report + log

Keep UI state (modals, selections) in a separate `uiStore`, not in `gameStore`.

---

## Step 8 — Persistence (Phase 6)

1. Add Supabase: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (see `.env.example`).
2. Implement `src/services/saveService.ts` for save/load using the schema in `context_files/`.
3. Use `context_files/supabase.sql` for schema and RLS.

---

## Step 9 — Point the landing page at the game

When the game is served from a path (e.g. `/game` or `https://yoursite.com/game/`):

1. Update the **repo root** `index.html` “Enter the Arena” redirect from  
   `context_files/gameplay-interface-final.html`  
   to the URL of this build (e.g. `/game/` or the production URL).
2. Ensure your server serves the built `game/dist/` at that path.

---

## Folder structure (current)

```
game/
├── public/           # Static assets (favicon, map geojson)
├── src/
│   ├── app/          # App.tsx, ErrorBoundary.tsx
│   ├── data/         # game_config.json (+ copy other JSON here)
│   ├── map/          # MapView.tsx
│   ├── state/        # types.ts, initState.ts, gameStore.ts
│   ├── styles/       # tokens.css, globals.css
│   ├── systems/      # turnEngine, validation, (actionResolver, aiResolver)
│   ├── ui/           # layout/, panels/, modals/, components/
│   ├── services/     # supabaseClient, saveService
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── BUILD_STEPS.md    # This file
└── README.md
```

---

## Scripts reference

| Command         | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | Start dev server                     |
| `npm run build`| Production build to `dist/`           |
| `npm run preview` | Serve `dist/` locally              |
| `npm run typecheck` | TypeScript check (no emit)        |
| `npm run lint` | ESLint on `src`                      |
| `npm run format` | Prettier on `src`                  |
| `npm test`     | Vitest unit tests                    |
| `npm run test:e2e` | Playwright E2E (configure as needed) |

---

## References

- **Game rules and data:** repo root `FULL_GAME_SYSTEM_DESIGN.md`, `REQUIRED_KEYS_AND_CONSTRAINTS.md`, `game_config.json`
- **Build and phases:** repo root `BUILD_PUBLIC_GAME.md`
- **Agent and code rules:** repo root `AGENTS.md`
- **Prototype behavior:** `context_files/gameplay-interface-final.html`, `context_files/script-with-zones.js`
