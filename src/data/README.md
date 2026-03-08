# Game data

- **game_config.json** — Loaded at startup. Defines turns, resources, metrics, win/fail conditions (from repo root `game_config.json`).
- Copy other content from the **repo root** into this folder as needed:
  - `territories.json`, `zones.json`, `zone_runtime_seed.json`, `actions.json`, `actors.json`, `dialogues.json`, `intel_reports.json`, `localization_en.json`

- **zone_runtime_seed.json** - Authored session-start seeds for zone-scoped runtime fields that are not present in `zones.json` itself, such as `displaced`, `threats`, `incidents`, and `actors_present`.

All values must come from these files; see root `AGENTS.md` and `REQUIRED_KEYS_AND_CONSTRAINTS.md`.
