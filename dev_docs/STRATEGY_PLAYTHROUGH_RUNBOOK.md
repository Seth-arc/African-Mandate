# Strategy Playthrough Runbook

This runbook tracks the three deterministic Turn 20 scripts required by Prompt 3 of `CONTROLLED_DESKTOP_DEMO_CLOSURE_PROMPT_BOOK.md`. It is not proof that the gate passed.

Current status: **BLOCKED** on candidate `0eb47d7`. All three Standard-difficulty production-preview runs ended at Turn 6 with Mandate Revoked, before the planned Turn 10 guest save/resume checkpoint. The dated records under `dev_docs/demo_evidence/2026-10-03/` are failed automated evidence, not signed human completion records.

The tables below are candidate scripts only. They use guest browser saves, the default valid target selected by the action UI, and one confirmed action on each listed turn. Turns not listed advance without a player action. The intended save, refresh, and resume point is Turn 10.

## Candidate security-heavy script

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

Planned category totals: security 4, intelligence 3, humanitarian 2, governance/economic 1. Security is the largest category; security plus intelligence is 70% of planned actions.

## Candidate diplomacy-heavy script

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Diplomacy International Outreach | diplomacy |
| 2 | Civil Society Partnership | diplomacy |
| 3 | Humanitarian Aid Distribution | humanitarian |
| 4 | Diplomacy International Outreach | diplomacy |
| 5 | Security Patrol Deployment | security |
| 6 | Civil Society Partnership | diplomacy |
| 8 | Diplomacy ECOWAS Coordination | diplomacy |

Planned category totals: diplomacy 5, humanitarian 1, security 1. Diplomacy is the largest category and represents 71.4% of planned actions.

## Candidate balanced script

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

Planned category totals: security 2, diplomacy 2, humanitarian 1, governance/economic 1, climate 1, intelligence 1. Six categories are represented and no category exceeds 25%.

## Automated result on 2026-10-03

| Script | Last resolved turn | Confirmed categories | Ending | Verdict |
| --- | ---: | --- | --- | --- |
| Security-heavy | 6 | security 2, intelligence 2, humanitarian 1 | Mandate Revoked; stability critical for three turns | FAIL |
| Diplomacy-heavy | 6 | diplomacy 4, humanitarian 1, security 1 | Mandate Revoked; stability critical for three turns | FAIL |
| Balanced | 6 | security 1, diplomacy 1, humanitarian 1, governance/economic 1, climate 1, intelligence 1 | Mandate Revoked; stability critical for three turns | FAIL |

The reproduced content/runtime blocker is:

1. `security_intercommunal_violence` can activate on Turn 1 and expires after its two-turn response window.
2. On expiry, its penalty applies `civilian_support -8`, `stability -6`, and `insurgency +6` and sets `intercommunal_escalated`.
3. In that same resolution, `security_intercommunal_mediation_failure` can trigger from `intercommunal_escalated` and applies the same metric damage again.
4. The success action `community_led_mediation` requires `community_mediation_unlocked`; that flag comes from the civil-society full-partnership dialogue, which is available only from Turn 5, after the response window has expired.
5. `active_events` have a `resolved` state in the runtime contract, but the current action/dialogue path does not mark these crises resolved. Recovery spending can then trigger the corruption/governance deadline chain.

Do not weaken critical thresholds, deadlines, costs, or failure rules to make these scripts pass. Closure requires an authored, tested response/resolution path that is available within the crisis window, followed by three fresh automated and human runs from the same candidate commit.

## Human-run commands

Build the exact candidate, then run the automated scripts against `dist`:

```powershell
npm ci
npm run build
npm run test:e2e:preview -- --project=chromium tests/e2e/strategy-playthroughs.spec.ts --workers=1
```

The operator must perform each script manually only after its automated run reaches and resolves Turn 20. Record per-turn action, key deltas, event/dialogue, save state, pacing, narrative clarity, console/page errors, final metrics/resources, ending, browser version, commit SHA, and PASS/FAIL under `dev_docs/demo_evidence/<YYYY-MM-DD>/`. An early ending, invalid action, deterministic mismatch, missing save, softlock, console error, or incomplete Turn 20 run is a FAIL and remains a release blocker.
