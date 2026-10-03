# Strategy Playthrough Runbook

This runbook defines the three deterministic Turn 20 scripts required by Prompt 3 of `CONTROLLED_DESKTOP_DEMO_CLOSURE_PROMPT_BOOK.md`. It is not release evidence. The human operator creates dated evidence records only after running the candidate commit.

All scripts use Standard difficulty, guest browser saves, the default valid target selected by the action UI, and one confirmed action on each listed turn. Turns not listed advance without a player action. Each run saves, refreshes, and resumes at Turn 10.

## Security-heavy

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Security Patrol Deployment | security |
| 2 | Intelligence Threat Assessment | intelligence |
| 3 | Humanitarian Aid Distribution | humanitarian |
| 4 | Security Patrol Deployment | security |
| 5 | Intelligence Network Cultivation | intelligence |
| 7 | Security Patrol Deployment | security |
| 9 | Intelligence Threat Assessment | intelligence |
| 11 | Humanitarian Aid Distribution | humanitarian |
| 13 | Security Patrol Deployment | security |
| 15 | Governance Audit Request | governance/economic |

Category totals: security 4, intelligence 3, humanitarian 2, governance/economic 1. Security is the largest category; security plus intelligence is 70% of confirmed actions.

## Diplomacy-heavy

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Diplomacy International Outreach | diplomacy |
| 2 | Civil Society Partnership | diplomacy |
| 3 | Humanitarian Aid Distribution | humanitarian |
| 4 | Diplomacy International Outreach | diplomacy |
| 5 | Security Patrol Deployment | security |
| 6 | Civil Society Partnership | diplomacy |
| 8 | Diplomacy ECOWAS Coordination | diplomacy |

Category totals: diplomacy 5, humanitarian 1, security 1. Diplomacy is the largest category and represents 71.4% of confirmed actions.

## Balanced

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Security Patrol Deployment | security |
| 2 | Civil Society Partnership | diplomacy |
| 3 | Humanitarian Aid Distribution | humanitarian |
| 4 | Governance Audit Request | governance/economic |
| 5 | Climate Drought Resilience | climate |
| 6 | Intelligence Threat Assessment | intelligence |
| 9 | Security Patrol Deployment | security |
| 12 | Diplomacy International Outreach | diplomacy |

Category totals: security 2, diplomacy 2, humanitarian 1, governance/economic 1, climate 1, intelligence 1. Six categories are represented and no category exceeds 25%.

## Human-run commands

Build the exact candidate, then run the automated scripts against `dist`:

```powershell
npm ci
npm run build
npm run test:e2e:preview -- --project=chromium tests/e2e/strategy-playthroughs.spec.ts --workers=1
```

The operator must then perform each script manually once in supported stable Chrome and record per-turn action, key deltas, event/dialogue, save state, pacing, narrative clarity, console/page errors, final metrics/resources, ending, browser version, commit SHA, and PASS/FAIL under `dev_docs/demo_evidence/<YYYY-MM-DD>/`. An early ending, invalid action, deterministic mismatch, missing save, softlock, console error, or incomplete Turn 20 run is a FAIL and remains a release blocker.
