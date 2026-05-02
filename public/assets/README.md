# Game static assets

Copied from the repo root `assets/` folder. Vite serves everything under `public/` at the root URL, so these are available as `/assets/...`.

## Current contents (from repo)

- **audio/** — Sound (music, SFX, VO)
- **vid/** — Video (e.g. opening scene)
- **css/**, **js/** — Legacy prototype assets (not used by the Vite app)

## Data reference policy

- **flags/**, **actors/**, **logos/**, **vid/**, and **img/** contain the assets currently referenced by JSON content and UI components.
- `cutscenes.json` intentionally points to shipped `/assets/vid/...` videos and `/img/...` stills until dedicated cutscene files are produced.
- `tests/unit/contentAssets.test.ts` fails if an actor portrait, cutscene video, or cutscene fallback image points at a missing public asset.

Use these paths in JSON and in components (e.g. `/assets/vid/African_Mandate_opening_scene.mp4`).
