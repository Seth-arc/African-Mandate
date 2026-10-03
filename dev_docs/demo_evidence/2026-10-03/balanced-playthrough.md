# Balanced playthrough — failed automated attempt

- Candidate commit: `0eb47d7`
- Date: 2026-10-03
- Mode: production preview, guest, Standard difficulty
- Browser: Playwright 1.58.2 bundled Chromium 152.0.7977.8
- Automated duration: 55.1 seconds
- Human observation: not performed; this is not signed completion evidence
- Verdict: **FAIL — ended on Turn 6 before the required Turn 20 resolution**

| Turn | Confirmed action(s) | Category | Key deltas | Event/dialogue | Save state | Observation |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Security Patrol Deployment | security | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 2 | Civil Society Partnership | diplomacy | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 3 | Humanitarian Aid Distribution | humanitarian | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 4 | Governance Audit Request | governance/economic | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 5 | Climate Drought Resilience | climate | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 6 | Intelligence Threat Assessment | intelligence | Stability reached 21 | Campaign outcome: Mandate Revoked | Turn 10 save/resume not reached | Stability remained critical for three consecutive turns |

Confirmed category totals before ending: security 1, diplomacy 1, humanitarian 1, governance/economic 1, climate 1, intelligence 1. Six categories were represented and each was 16.7% of confirmed actions, but the run is non-qualifying because it ended before Turn 20.

Final metrics: stability 21, insurgency 75, civilian support 15, global legitimacy 24, regional synergy 35.

Final resources: budget $8.5M, political capital 23, personnel 1,560, intel points 15, time 31 months.

Ending: Mandate Revoked on Turn 6. Fail trigger: stability remained in the critical band for three consecutive turns. The test stopped before its final console/page-error assertion; no runner-level page error was printed, but error-free status is not claimed.

Reproduce:

```powershell
npx playwright test tests/e2e/strategy-playthroughs.spec.ts --config=playwright.preview.config.ts --project=chromium --workers=1 --grep "balanced"
```
