# African Mandate: Sahel Arena — Agent Instructions

## Project Overview
A turn-based strategy game where you play the AU Special Envoy in the Sahel. Built with Vite + React 18 + TypeScript (strict) + Zustand + React-Leaflet + Supabase + Zod.

## Critical Constraints

### Before Writing Code
- Read all referenced project files in `context_files/` before implementing any task.
- If a file is missing or ambiguous, STOP and ask. Never guess game rules, metric values, or formulas.
- Every game value (costs, thresholds, effects) must come from the project data files. No invented values.

### TypeScript Strict Mode
- `tsconfig.json` uses `"strict": true`, `"noUncheckedIndexedAccess": true`.
- Zero `any` types. Use `unknown` with type guards or define proper types.
- No `as unknown as`, `@ts-ignore`, `@ts-expect-error`, or non-null assertions (`!`) without documented justification.

### State Management
- `GameState` in `src/state/types.ts` is the frozen contract. Any change requires listing every affected file and updating them all in the same task.
- All state updates are immutable (spread operators or structuredClone). Never mutate directly.
- UI state (modals, selections, hover) lives in `uiStore`, never in `gameStore`.

### Architecture Rules
- Dependency direction: `data` → `state/types` → `systems` → `state/gameStore` → `ui`. No circular imports.
- No game logic in React components. Components read from store and call engine functions.
- Every public engine function validates inputs and throws `GameError` on invalid input.
- No silent failures. Every `catch` block recovers meaningfully or re-throws with context.

### Runtime Validation
- Zod schemas define all data structures. TypeScript types are generated via `z.infer<>`.
- All JSON data validated at startup. Invalid data fails with clear error messages.

### Testing
- Tests assert specific values from project data files, not just "doesn't throw."
- Every test cites the source file and rule being verified.
- No mocking the game engine in unit tests.

### Component Pattern
- Every component handles three states: loading, empty, populated.
- The first component built (ResourcePanel) is the reference pattern. All others follow it.

## Build and Test Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run lint         # ESLint
npm run format       # Prettier
npm test             # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run validate     # Validate JSON data schemas
```

## File Conventions
- Files: `camelCase.ts` for modules, `PascalCase.tsx` for components
- Types: `PascalCase` — `GameState`, `ActionDefinition`, `TerritoryData`
- Stores: `use[Name]Store` — `useGameStore`, `useUiStore`
- Engine functions: verb-first — `applyAction`, `advanceTurn`, `evaluateVictory`
- Components: `PascalCase` matching filename — `ResourcePanel`, `IntelFeed`
- Constants: `UPPER_SNAKE` — `MAX_TURNS`, `INITIAL_BUDGET`
- Handlers: `handle[Event]` — `handleActionSelect`, `handleTurnEnd`

## Regression Policy
If a task breaks something from a prior task, do NOT patch forward. Stop, identify the root cause, report which prior task introduced the issue, and propose a fix before continuing.

## Approved Dependencies
Vite, React 18, TypeScript 5, Zustand, React-Leaflet, Supabase, Zod, Vitest, Playwright, ESLint, Prettier. No additional runtime dependencies without explicit approval.
