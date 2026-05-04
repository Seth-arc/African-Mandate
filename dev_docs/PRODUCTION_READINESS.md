# Production Readiness

This document is the canonical production support contract for African Mandate: Sahel Arena. Other docs must link here instead of restating browser, device, storage, media, or network support.

## Supported Release Target

The supported release target is the **v0.1 public web release for desktop and laptop browsers**. It is a production-supported public game surface for the device classes listed below. It is not a phone release, tablet release, native app, multiplayer product, paid product, or durable analytics release.

Data posture remains synthetic scenario content, local QA-only telemetry, guest browser saves, and optional Supabase-backed authenticated saves. No service-role key or backend credential may be placed in a `VITE_*` variable.

## Release Support Matrix

| Area | Supported production behavior | Unsupported or gated behavior | Required evidence |
| --- | --- | --- | --- |
| Browsers | Current stable Chromium-family desktop browsers: Chrome and Edge on Windows, macOS, and Linux. JavaScript, ES modules, CSS grid/flex, canvas/WebGL-compatible rendering, local storage, and HTML5 MP4 video support must be available. | Firefox, Safari, embedded webviews, IE mode, legacy browsers, browsers with JavaScript disabled, browsers without local storage, and browsers without MP4 media support. Unsupported browsers receive the release-support gate before campaign start when detectable. | `npm run test:e2e` release-support gate suite plus manual Chrome and Edge smoke before production promotion. |
| Supported device class | Desktop or laptop with viewport at least 1280 x 720 CSS pixels, visible keyboard available, and fine pointer input through mouse, trackpad, or equivalent. Touch-capable laptops are supported only when a fine pointer and keyboard are available. | Viewports below 1280 x 720, phones, tablets, touch-only devices, kiosk/webview shells, and any device where the player cannot use keyboard plus fine pointer input. | E2E supported-desktop cases at standard and minimum supported viewport sizes. |
| Pointer and keyboard | All production play assumes keyboard access plus precise pointer selection for map, action review, session manager, modals, and save controls. Keyboard focus order and Escape handling are part of the support contract. | Touch-only play, controller-only play, screen-keyboard-only play, and stylus-only play are not supported production journeys for v0.1. | E2E keyboard modal flow and release-support gate cases for phone, tablet, and narrow desktop. |
| Audio and video | Muted intro video and optional in-game audio may load. Audio is never required for game-state comprehension. Players may keep audio blocked or muted and still play. | Browsers unable to load the shipped MP4 intro media are gated because the production entry flow depends on HTML5 video readiness/fallback behavior. | Static asset validation, production build, and release-support preflight. |
| Storage and saves | Guest saves require writable browser local storage in the current browser profile. Authenticated cloud saves require Supabase Auth, Supabase database availability, and correct RLS configuration. | Private browsing cleanup, disabled storage, cleared site data, browser changes, or blocked Supabase network can remove or prevent saves. Storage-disabled browsers are gated before campaign start. | Unit save-service tests, manual guest-save smoke, and staged Supabase auth/cloud-save smoke before production promotion. |
| Network | Initial page load requires HTTPS network access to the deployed app and shipped static assets. Authenticated play requires Supabase network access. Guest play may continue after assets load, but offline entry is not a supported production start path. | Offline entry, captive portals, blocked static assets, blocked Supabase endpoints, or corporate filters that prevent media/assets from loading. Offline entry is gated when `navigator.onLine` reports offline. | Build asset validation, deployment smoke, and manual online/offline save recovery check. |
| Telemetry | Local QA telemetry is opt-in and stored only in the browser runtime queue. It is for QA inspection, not production observability. | Durable production analytics, remote player monitoring, ad tracking, payment analytics, or retention analytics are not enabled in v0.1. | `dev_docs/TELEMETRY_REQUIREMENTS.md` remains aligned with this contract. |

## Unsupported User Gate

The landing entry button must run a release-support preflight before activating the React game shell or opening the session manager. Unsupported users must see a clear gate explaining the detected blocker before a new or resumed campaign can start.

The gate is required for:

- unsupported browser family
- viewport below 1280 x 720
- phone user agent
- tablet or touch-only input
- missing fine pointer
- disabled or unwritable local storage
- missing MP4 media support
- browser-reported offline state

Closing the gate may return the user to the landing page, but it must not start a campaign or mount the active game interface for an unsupported environment.

## Save Behavior

- Guest play stores saves in the current browser through local storage. Clearing site data, private browsing cleanup, or changing browsers can remove guest saves.
- Authenticated play uses Google OAuth through Supabase and stores cloud saves under the authenticated user.
- Autosave runs after important state changes including actions, dialogue, intel interactions, and end-turn resolution when autosave is enabled.
- Manual save is available from the session menu.
- A failed save shows an in-game error banner with retry. The game state remains active; the player should retry before closing the tab.
- `VITE_SUPABASE_ANON_KEY` is intentionally public client infrastructure. It is safe to expose to the browser only when Supabase Auth and row-level security policies enforce access. Service-role keys and backend credentials must never be placed in `VITE_*` variables.

## Known Limitations

- The automated production browser gate is Chromium-based today; Chrome and Edge manual smoke remains required before promotion.
- Firefox and Safari are not production-supported for v0.1.
- Durable production analytics are not enabled; telemetry is local QA-only and opt-in.
- Cutscenes currently reuse shipped video and still assets until the final dedicated media set is produced.
- Phone, tablet, and touch-only play are blocked, not degraded.
- Cloud saves depend on Supabase availability and correct environment configuration.
- Guest saves are browser-local and cannot be recovered after local storage deletion.

## Recovery Steps

- Release-support gate shown to a supported desktop/laptop user: confirm Chrome or Edge stable, viewport at least 1280 x 720, local storage enabled, online status, and MP4 media support. Reproduce with `npm run test:e2e` before changing the gate.
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
