# African Mandate: Sahel Arena - Public Build Guide

This document lays out a complete, end-to-end process for rebuilding and shipping the game to public audiences. It is based on the current prototype UI and logic in:
- context_files/gameplay-interface-final.html
- context_files/script-with-zones.js
- context_files/NEW_BUILD_ARENA_SAHEL_DESCRIPTION.md
- context_files/NEW_BUILD_ARENA_SAHEL_NARRATIVE_BOOK.md
- context_files/NEW_FEATURES_DOCUMENTATION.md

The current release stance is a **desktop-only public demo** that is maintainable, testable, and ready for public audience evaluation on desktop/laptop browsers. It is not yet a fully certified production public game because mobile play is blocked and telemetry is local QA-only rather than durable production analytics.

---

## 1) Product definition and scope

### 1.1 Core game promise
- You play the AU Special Envoy and make turn-based strategic decisions in the Sahel.
- Each turn you allocate limited resources, respond to intelligence, and manage actors.
- Your choices shift regional metrics, territory status, and actor sentiment.
- You win by meeting multi-metric victory conditions within the mandate timeframe.

### 1.2 Target audience
- Strategy and simulation players
- Policy and international relations enthusiasts
- Educators and civic engagement groups

### 1.3 Success metrics
- Engagement: session length, return rate, completion rate
- Learning: survey feedback, qualitative sentiment
- Reliability: crash-free sessions, performance targets

### 1.4 Scope control
- Maintain focus on turn-based strategy, not real-time combat.
- Expand depth through data, events, and narrative, not tech complexity.
- Use the existing prototype as the primary reference for UI and flow.
- Public demo launch blocks phone-sized touch devices until the mobile layout, touch flow, accessibility, and performance gates pass.
- Production public game launch remains blocked until durable telemetry replaces the local QA-only browser queue.

---

## 2) Technical architecture (recommended)

### 2.1 Frontend stack
- Vite + React + TypeScript
- Zustand for game state (simple, fast, scalable)
- React-Leaflet for map
- CSS Modules or styled components (choose one and be consistent)

### 2.2 Backend stack
- Supabase for auth and save/load
- Postgres for sessions and action logs
- Row-level security enabled

### 2.3 Repo layout (example)
```
.
├─ public/
│  ├─ favicon.svg
│  ├─ robots.txt
│  ├─ manifest.webmanifest
│  └─ assets/              # static, cacheable files (icons, images)
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ routes.tsx
│  │  └─ ErrorBoundary.tsx
│  ├─ data/
│  │  ├─ territories.json
│  │  ├─ zones.json
│  │  ├─ actions.json
│  │  ├─ actors.json
│  │  ├─ intel.json
│  │  ├─ dialogues.json
│  │  └─ events.json
│  ├─ state/
│  │  ├─ gameStore.ts       # Zustand store
│  │  ├─ selectors.ts
│  │  ├─ types.ts
│  │  └─ initState.ts
│  ├─ systems/
│  │  ├─ turnEngine.ts
│  │  ├─ actionResolver.ts
│  │  ├─ aiResolver.ts
│  │  ├─ resourceRules.ts
│  │  └─ validation.ts
│  ├─ ui/
│  │  ├─ layout/
│  │  ├─ panels/
│  │  ├─ modals/
│  │  └─ components/
│  ├─ map/
│  │  ├─ MapView.tsx
│  │  └─ mapStyles.ts
│  ├─ services/
│  │  ├─ supabaseClient.ts
│  │  ├─ saveService.ts
│  │  └─ analytics.ts
│  ├─ assets/               # bundled assets (fonts, svg, images)
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ globals.css
│  │  └─ theme.css
│  ├─ main.tsx
│  └─ vite-env.d.ts
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ scripts/
│  ├─ validate-data.ts
│  └─ export-assets.ts
├─ .env.example
├─ .eslintrc.cjs
├─ .prettierrc
├─ .gitignore
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ README.md
```

### 2.4 Required files and their use (production-ready)

Core app
- `src/main.tsx` - React app bootstrap, providers, and global styles.
- `src/app/App.tsx` - Root layout and route shell.
- `src/app/routes.tsx` - Central route definitions.
- `src/app/ErrorBoundary.tsx` - Catch runtime UI errors.

Game engine and state
- `src/state/gameStore.ts` - Global state store (Zustand).
- `src/state/types.ts` - Strong types for GameState and data.
- `src/state/initState.ts` - Default game state for new sessions.
- `src/systems/turnEngine.ts` - Turn advancement and AI integration.
- `src/systems/actionResolver.ts` - Apply player actions and costs.
- `src/systems/aiResolver.ts` - Opposition/intel logic.
- `src/systems/resourceRules.ts` - Resource clamping and validation.
- `src/systems/validation.ts` - Input validation for data and actions.

Content and data
- `src/data/*.json` - Territories, zones, actions, actors, intel, dialogues, events.
- `public/assets/` - Static assets served as-is (map tiles, large images).
- `src/assets/` - Bundled assets for import in components (icons, svg).

UI and map
- `src/ui/layout/` - Header, sidebars, action bar, layout shells.
- `src/ui/panels/` - Resource panels, intel feed, actor list.
- `src/ui/modals/` - Action modal, intel report, dialogue, status report.
- `src/ui/components/` - Reusable UI atoms and molecules.
- `src/map/MapView.tsx` - Leaflet map container and layers.
- `src/map/mapStyles.ts` - Shared styles for markers and choropleth.

Persistence and services
- `src/services/supabaseClient.ts` - Auth + database client.
- `src/services/saveService.ts` - Save/load session logic.
- `src/services/analytics.ts` - Optional telemetry with privacy guardrails.
- `supabase.sql` (or `database/`) - Schema + RLS policies and migrations.

Tooling and quality
- `.env.example` - Required environment variables.
- `.eslintrc.cjs` / `.prettierrc` - Lint and formatting rules.
- `tsconfig.json` / `tsconfig.node.json` - TS settings for app and tooling.
- `vite.config.ts` - Vite build config.
- `tests/` - Unit, integration, and e2e tests.
- `scripts/validate-data.ts` - CI validation for JSON schemas and assets.

Docs and ops
- `README.md` - Setup, scripts, and high-level architecture.
- `BUILD_PUBLIC_GAME.md` - Build plan and release checklist.
- `SECURITY.md` - Disclosure policy (recommended for public release).
- `LICENSE` - OSS or custom license terms.
- `CODE_OF_CONDUCT.md` - Contributor guidelines (if open source).
- `.github/workflows/ci.yml` - CI for lint, test, build, and deploy.

---

## 3) Phase plan (public release)

### Phase 0 - Discovery
- Goal: Align on what the game is, who it serves, and the exact rules.
- Extract gameplay rules from the prototype and narrative docs.
- Inventory all current features and content (UI, systems, data, assets).
- Confirm final victory/lose conditions (pick one authoritative set).
- Confirm total acts, turns per act, and time per turn.
- Define final features for MVP vs post-launch.
- Identify legal/sensitivity constraints and localization needs.

Decisions:
- Single source of truth for rules (GDD).
- Canonical metrics and thresholds.
- Map scope (countries, zones, overlays).

### Phase 1 - Preproduction
- Goal: Lock the design so engineering can build without ambiguity.
- Convert the prototype into a design spec (screens, flows, modals, edge cases).
- Create data definitions for territories, zones, actors, actions, and events.
- Document game formulas (resource costs, AI responses, metric deltas).
- Define content pipelines (JSON files, asset naming, versioning rules).
- Produce a UI style guide (type scale, spacing, color tokens, components).

Deliverables:
- Game design document (GDD)
- Data schema definitions
- UI reference board

Exit criteria:
- Every screen has a wireframe and interaction notes.
- Every metric has a formula, range, and clamp rules.
- All content types have schemas and ownership.

### Phase 2 - Scaffold and tooling
- Goal: Build the foundation for a production-quality app.
- Initialize Vite + React + TS.
- Add Zustand, React-Leaflet.
- Add ESLint, Prettier, Vitest, Playwright.
- Add CI (lint + typecheck + test + build).
- Add environment config and secrets strategy (.env example).
- Set up asset pipeline (images, fonts, geojson).

Deliverables:
- Build pipeline
- Test pipeline
- Baseline app shell

Exit criteria:
- App builds locally and in CI.
- Lint + typecheck + tests run in one command.
- Folder structure matches the plan.

### Phase 3 - Core game engine (logic only)
Build the game as pure functions before UI wiring.

Key modules:
- GameState types and defaults
- Turn engine (advance turn, reset actions, apply AI)
- Action resolver (apply action, resource costs, effects)
- AI resolver (apply counter-pressure and intel shifts)
- Outcome logger

Deliverables:
- Engine unit tests
- Deterministic turn simulation

Details:
- Use pure functions and immutable updates.
- Seedable RNG for reproducible test runs.
- Enforce clamping and validation at the engine boundary.
- Keep UI out of the engine to maximize test coverage.

Exit criteria:
- Action -> state transitions are deterministic.
- Game can simulate 10+ turns without UI.
- All core rules are unit tested.

### Phase 4 - Data-driven content
- Goal: Make the game content editable without changing code.
- Move the hard-coded content from script-with-zones.js into JSON.
- Map all territory/zone data from sahel_countries.geojson.
- Standardize asset references (icons, flags, avatars, intel images).
- Validate data (schema checks) and add fallback handling.
- Add localization-ready strings if multilingual release is planned.

Deliverables:
- Data files
- Content validation scripts

Exit criteria:
- Engine runs entirely from JSON data.
- Invalid data fails fast with clear errors.
- Assets resolve consistently in dev and prod.

### Phase 5 - UI rebuild
Recreate the interface with React components.

Priority order:
1) Layout skeleton (header, sidebars, center map)
2) Resource and metrics panels
3) Map and territory details
4) Action flow (select, configure, confirm)
5) Intel feed + modal
6) Actor dialogue + modal
7) Status report + log

Deliverables:
- Feature parity with prototype UI
- Visual regression checks

Details:
- Keep layout responsive for common desktop widths.
- Separate UI state (open modals) from game state (metrics, resources).
- Add empty and error states (no intel, no actions remaining, etc).
- Align typography and spacing to the reference style guide.

Exit criteria:
- All UI paths are wired to real state and data.
- No hard-coded data in components.
- UI passes basic accessibility checks.

### Phase 6 - Persistence and auth
- Goal: Allow players to save, resume, and own their data.
- Implement Supabase auth (Google sign-in).
- Implement save/resume using sessions and action log tables.
- Enforce RLS policies.
- Add migration scripts for schema versioning.
- Decide save cadence (after each action, end of turn, or both).

Deliverables:
- Save/load workflow
- User profile screen

Exit criteria:
- Users can sign in, save, and resume reliably.
- Unauthorized users cannot access other sessions.
- Save and load times are acceptable.

### Phase 7 - Testing and QA
- Goal: Prevent regressions and ensure the game is stable.
- Unit tests for engine logic
- Integration tests for action flows
- Playwright flows for critical paths
- Manual QA for balance and UX
- Cross-browser checks (Chromium, Firefox, Safari)

Deliverables:
- Test coverage report
- QA checklist

Exit criteria:
- All critical paths pass in CI.
- No known blocker bugs.
- Balance issues documented and triaged.

### Phase 8 - Performance and polish
- Goal: Make the game smooth and visually consistent.
- Optimize Leaflet layers and markers
- Memoize heavy panels
- Lazy load modal content
- Reduce asset sizes and use compression
- Add graceful loading states and skeletons
- Verify accessibility (contrast, focus, motion)

Deliverables:
- Lighthouse scores
- Performance budget

Exit criteria:
- Smooth interaction on mid-tier laptops.
- No major layout shifts during play.
- Lighthouse targets met (define them in Phase 1).

### Phase 9 - Public release
- Goal: Ship safely and maintain a feedback loop.
- Staging deployment
- Beta testing group
- Final bug fixes
- Production release
- Post-launch operations plan (bug triage, patch cadence)

Deliverables:
- Release notes
- Operations plan

Exit criteria:
- Staging sign-off by team and testers.
- No critical issues in the final checklist.
- Monitoring and rollback plan ready.

---

## 4) Gameplay systems checklist

### 4.1 Turn system
- Max turns, actions per turn
- End turn confirmation
- AI model that shifts metrics
- Time remaining counter (timed turns are required)

### 4.2 Actions and resources
- Categories: security, diplomacy, humanitarian, governance_economic, climate, intelligence, community_mediation
- Costs: budget, personnel, political_capital, intel_points, time_months
- Outcomes: metric shifts, territory changes, actor sentiment

### 4.3 Territories and zones
- Status (low, moderate, high, critical)
- Zone-level risks and intel markers
- Realistic info displayed per territory

### 4.4 Actors and dialogue
- Actor sentiment scores
- Dialogue options apply effects
- Dialogue history in status log

### 4.5 Intelligence
- Reports with sources and urgency
- Intel map overlays
- Reports influence decisions

### 4.6 Victory and failure conditions
- Define one set of official victory thresholds
- Lock criteria in code and UI
- Runtime contract: initialize metrics + win thresholds from `game_config.json`; keep `canonical_masters.json:METRICS_MASTER` as the audit source of truth and ensure it matches `game_config.json` (validator enforces this).
- Add summary at end of game

---

## 5) Data modeling (minimum)

### 5.1 GameState
- act (derived), turn, actions_remaining, max_turns
- Resources (budget, personnel, political_capital, intel_points, time_months)
- Metrics (stability, insurgency, civilian_support, global_legitimacy, regional_synergy)
- AI state (opposition_pressure, intel_confidence)
- Territories and zones
- Action log and outcome log

### 5.2 Action schema
- action_id, name, category
- allowed regions and zones
- cost ranges
- outcome profile (metrics, actor deltas, intel delta)

### 5.3 Event schema
- trigger conditions
- urgency window
- narrative content
- effect map

---

## 6) UI rebuild guidance

### 6.1 Map
- Use React-Leaflet
- Load sahel_countries.geojson for boundaries
- Render intel markers from data

### 6.2 Layout
- Fixed header and split panels (left metrics, center map, right intel/actors)
- Maintain the action bar at bottom
- Use consistent spacing and readable type scales

### 6.3 Modals
- Actions: selection, configuration, confirmation
- Intel report modal
- Actor dialogue modal
- Status report modal
- Mission brief modal

---

## 7) Backend and persistence

### 7.1 Supabase tables
- sessions (one per game run)
- actions_log (one per action or event)
- optional: outcomes_log

### 7.2 Save/load
- Save: after each action and end turn
- Load: resume from latest session
- RLS: restrict sessions to owners

---

## 8) Quality, testing, and balance

### 8.1 Unit tests
- Action cost validation
- Resource clamping and rules
- Turn advancement and AI deltas

### 8.2 Integration tests
- Start -> take action -> end turn -> next turn
- Dialogue choice -> resource change
- Intel report open/close

### 8.3 Balance passes
- Validate that victory is achievable
- Ensure multiple viable strategies
- Avoid degenerate loops

---

## 9) Ethics, safety, and narrative sensitivity

This game uses real-world conflicts. Treat content responsibly.
- Avoid caricatures or harmful stereotypes
- Keep sources and narrative grounded
- Provide disclaimers about fictionalization
- Offer links to educational resources (optional)

---

## 10) Accessibility

- Contrast checks
- Keyboard navigation
- Screen reader labels on buttons
- Reduce motion option

---

## 11) Analytics and telemetry

- Track only anonymous, minimal events
- Respect privacy laws (GDPR/CCPA)
- Provide opt-out if tracking is used

---

## 12) Deployment and operations

### 12.1 Hosting
- Vercel or Netlify
- Supabase for backend

### 12.2 Environments
- Local
- Staging
- Production

### 12.3 Release checklist
- All tests pass
- No console errors
- Performance targets met
- Legal and privacy reviewed

---

## 13) Suggested build order (short version)

1) Finalize GDD and victory conditions
2) Build TS game engine + tests
3) Move all content into JSON
4) Rebuild UI in React
5) Integrate map and overlays
6) Wire actions and turn loop
7) Add Supabase saves
8) QA, balance, and polish
9) Stage beta, then public launch

---

## 14) MVP vs post-launch

### MVP (public)
- Core loop, map, actions, intel, dialogue, status log
- Save/load and auth
- One full act with tuned balance

### Post-launch
- Additional acts and events
- Expanded AI and dynamic events
- Achievements and replay analysis

---

If you want, I can convert this into a project task list with milestones and issue templates.
