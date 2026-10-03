# Security-heavy playthrough — failed automated attempt

- Candidate commit: `0eb47d7`
- Date: 2026-10-03
- Mode: production preview, guest, Standard difficulty
- Browser: Playwright 1.58.2 bundled Chromium 152.0.7977.8
- Automated duration: 49.6 seconds
- Human observation: not performed; this is not signed completion evidence
- Verdict: **FAIL — ended on Turn 6 before the required Turn 20 resolution**

| Turn | Confirmed action(s) | Category | Key deltas | Event/dialogue | Save state | Observation |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Security Patrol Deployment | security | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 2 | Intelligence Threat Assessment | intelligence | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 3 | Humanitarian Aid Distribution | humanitarian | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 4 | Security Patrol Deployment | security | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 5 | Intelligence Network Cultivation | intelligence | Not retained; run failed before record attachment | Not human-annotated | No manual checkpoint | Continued |
| 6 | None | — | Stability reached 23 | Campaign outcome: Mandate Revoked | Turn 10 save/resume not reached | Stability remained critical for three consecutive turns |

Confirmed category totals before ending: security 2, intelligence 2, humanitarian 1. Security plus intelligence was 80% of confirmed actions, but the run is non-qualifying because it ended before Turn 20.

Final metrics: stability 23, insurgency 72, civilian support 9, global legitimacy 26, regional synergy 39.

Final resources: budget $9.8M, political capital 37, personnel 1,430, intel points 40, time 34 months.

Ending: Mandate Revoked on Turn 6. Fail trigger: stability remained in the critical band for three consecutive turns. The test stopped before its final console/page-error assertion; no runner-level page error was printed, but error-free status is not claimed.

Reproduce:

```powershell
npx playwright test tests/e2e/strategy-playthroughs.spec.ts --config=playwright.preview.config.ts --project=chromium --workers=1 --grep "security-heavy"
```
