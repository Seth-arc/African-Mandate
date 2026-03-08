# Game static assets

Copied from the repo root `assets/` folder. Vite serves everything under `public/` at the root URL, so these are available as `/assets/...`.

## Current contents (from repo)

- **audio/** — Sound (music, SFX, VO)
- **vid/** — Video (e.g. opening scene)
- **css/**, **js/** — Legacy prototype assets (not used by the Vite app)

## Expected by game data (add when you have the files)

- **flags/** — Territory flags (mali.png, burkina_faso.png, niger.png, chad.png, mauritania.png) — see `territories.json`
- **actors/** — Actor portraits and icons — see `actors.json`
- **cutscenes/** — Cutscene videos and poster images — see `cutscenes.json`

Use these paths in JSON and in components (e.g. `/assets/vid/African_Mandate_opening_scene.mp4`).
