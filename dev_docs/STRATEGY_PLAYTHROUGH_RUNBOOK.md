# Strategy Playthrough Runbook

This runbook tracks the three deterministic Turn 20 scripts required by Prompt 3 of `CONTROLLED_DESKTOP_DEMO_CLOSURE_PROMPT_BOOK.md`. It is not proof that the gate passed.

Current status: **CHROMIUM AUTOMATION PASSED; PRODUCTION PROMOTION BLOCKED**. The supplied candidate build passed static asset validation, Pages validation, typecheck, production build, and the bundle budget. The focused no-CDN landing-motion fallback passed, and the security-heavy, diplomacy-heavy, and balanced Chromium scripts all reached and resolved Turn 20 with deterministic guest resume. Stable Chrome and Edge production-preview runs and all three signed human runs from the same committed candidate remain required. Do not mark the prompt complete or promote production from Chromium automation alone.

The tables below are candidate scripts only. They use guest browser saves and the default valid target selected by the action UI. Multiple rows on one turn are performed in table order. Immediately after each Turn 1 Civil Society Partnership action, choose **Full Partnership** in the civil-society dialogue; this unlocks Community-Led Mediation for Turn 2. Turns not listed advance without a player action. The intended save, refresh, and resume point is Turn 10.

## Candidate security-heavy script

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Security Patrol Deployment | security |
| 1 | Civil Society Partnership, then Full Partnership dialogue | diplomacy |
| 2 | Intelligence Threat Assessment | intelligence |
| 2 | Community-Led Mediation | community mediation |
| 3 | Humanitarian Corridor Establishment | humanitarian |
| 4 | Security Patrol Deployment | security |
| 5 | Intelligence Network Cultivation | intelligence |

Planned category totals: security 2, intelligence 2, humanitarian 1, diplomacy 1, community mediation 1. Security and intelligence are jointly largest; together they represent 57.1% of planned actions. The script consumes exactly 59 political capital, leaving 1.

## Candidate diplomacy-heavy script

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Diplomacy International Outreach | diplomacy |
| 1 | Civil Society Partnership, then Full Partnership dialogue | diplomacy |
| 2 | Community-Led Mediation | community mediation |
| 3 | Humanitarian Corridor Establishment | humanitarian |
| 5 | Security Patrol Deployment | security |

Planned category totals: diplomacy 2, community mediation 1, humanitarian 1, security 1. Diplomacy is the largest category and diplomacy plus community mediation represents 60% of planned actions. The script consumes exactly 56 political capital, leaving 4.

## Candidate balanced script

| Turn | Action | Category |
| ---: | --- | --- |
| 1 | Security Patrol Deployment | security |
| 1 | Civil Society Partnership, then Full Partnership dialogue | diplomacy |
| 2 | Community-Led Mediation | community mediation |
| 3 | Humanitarian Corridor Establishment | humanitarian |
| 5 | Climate Drought Resilience | climate |
| 6 | Intelligence Threat Assessment | intelligence |

Planned category totals: security 1, diplomacy 1, community mediation 1, humanitarian 1, climate 1, intelligence 1. Six categories are represented equally. The script consumes exactly 57 political capital, leaving 3.

## Automated result on 2026-10-03

| Script | Last resolved turn | Confirmed categories | Ending | Verdict |
| --- | ---: | --- | --- | --- |
| Security-heavy | 6 | security 2, intelligence 2, humanitarian 1 | Mandate Revoked; stability critical for three turns | FAIL |
| Diplomacy-heavy | 6 | diplomacy 4, humanitarian 1, security 1 | Mandate Revoked; stability critical for three turns | FAIL |
| Balanced | 6 | security 1, diplomacy 1, humanitarian 1, governance/economic 1, climate 1, intelligence 1 | Mandate Revoked; stability critical for three turns | FAIL |

The blocker reproduced on candidate `0eb47d7` was:

1. `security_intercommunal_violence` can activate on Turn 1 and expires after its two-turn response window.
2. On expiry, its penalty applies `civilian_support -8`, `stability -6`, and `insurgency +6` and sets `intercommunal_escalated`.
3. In that same resolution, `security_intercommunal_mediation_failure` can trigger from `intercommunal_escalated` and applies the same metric damage again.
4. The success action `community_led_mediation` requires `community_mediation_unlocked`; that flag comes from the civil-society full-partnership dialogue, which is available only from Turn 5, after the response window has expired.
5. `active_events` have a `resolved` state in the runtime contract, but the current action/dialogue path does not mark these crises resolved. Recovery spending can then trigger the corruption/governance deadline chain.

Do not weaken critical thresholds, deadlines, costs, or failure rules to make these scripts pass. Closure requires an authored, tested response/resolution path that is available within the crisis window, followed by three fresh automated and human runs from the same candidate commit.

The working-tree remediation preserves those rules:

1. Civil-society dialogue is available on Turns 1-10 once its existing action flag is set.
2. Full Partnership unlocks Community-Led Mediation on Turn 1; the mediation action runs on Turn 2 after the crisis has activated.
3. `security_intercommunal_violence` declares `mediation_action_success == true` as its authored resolution condition.
4. Runtime resolves matching active events before deadline expiry, so a resolved event cannot receive its penalty bundle.
5. A missed deadline still applies the parent penalty once; the failure follow-up retains its narrative flag but no longer duplicates the same metric damage.

These changes are **not yet a passing gate**. Run the unit and production-preview commands, then replace this status only after all three automated and signed human runs finish Turn 20 from one commit.

## Automated result after the mediation remediation

The supplied verification output passed all 13 focused unit tests, asset validation, Pages validation, typecheck, production build, and the raw/gzip bundle budget. All nine strategy cases then failed consistently across Chromium, Chrome, and Edge:

| Script | Last resolved turn | Failure |
| --- | ---: | --- |
| Security-heavy | 5 | `failure_on_deadline:governance_crisis` |
| Diplomacy-heavy | 4 | `failure_on_deadline:governance_crisis` |
| Balanced | 5 | `failure_on_deadline:governance_crisis` |

The new closure keeps the fatal deadline intact. Full civil-society partnership now establishes community anti-corruption monitoring; procurement, ghost-aid, and unmonitored-security triggers recognize that oversight. A governance crisis that was already active can be resolved before its deadline by community monitoring, formal oversight, or a pending audit. The scripts also stop before exceeding the fixed 60-point political-capital pool.

## Automated result after the governance remediation

The supplied verification output passed asset validation, Pages validation, typecheck, production build, and the bundle budget. Thirteen of fifteen focused unit tests passed; the two failures showed that an absent narrative flag does not satisfy `flag != true` in the expression DSL. The three strategies then advanced consistently to Turn 7 in Chromium, Chrome, and Edge before the same fatal deadline:

| Script | Last resolved turn | Failure |
| --- | ---: | --- |
| Security-heavy | 7 | `failure_on_deadline:humanitarian_corridor_failure` |
| Diplomacy-heavy | 7 | `failure_on_deadline:humanitarian_corridor_failure` |
| Balanced | 7 | `failure_on_deadline:humanitarian_corridor_failure` |

The next closure exposes `anti_corruption_monitoring_active` as an explicit false-by-default derived signal, adds corridor-success resolution conditions to the IDP surge and corridor-failure events, and schedules the existing Humanitarian Corridor Establishment action on Turn 3. The fatal deadline remains unchanged.

## Automated result after the humanitarian remediation

The supplied verification output passed all 16 focused unit tests, asset validation, Pages validation, typecheck, the production build, and the bundle budget at **1,231,203 raw bytes / 320,980 gzip bytes**. All three Chromium strategies reached the Turn 10 save checkpoint and restored the expected `10/20` state. Each case then failed only because the resume helper required zero dialogs while the game correctly presented the Act 3 briefing for Turn 10.

This was a test-harness blocker, not evidence of a save-state or campaign-ending failure. The first helper remediation handled the specifically named Act briefing through **Continue to operations**, but that primary action intentionally opens **Take Action**. The latest supplied Chromium run exposed that second expected state at Turn 5 in all three strategies. The helper now asserts and closes that named action dialog through its explicit control; it still throws on any unknown post-turn modal. Chromium completion, Chrome, Edge, Turn 20 completion, and signed human evidence remain unverified.

## Automated result after the resume-overlay remediation

The next supplied Chromium run stopped all three cases in `dismissPostTurnOverlays` during the normal end-turn loop. The console output did not report the failing turn or identify the visible dialog, and its screenshot, trace, and accessibility snapshot were not present in the workspace when reviewed. The earlier run remains the evidence that all three strategies reached and restored Turn 10; no Turn 20 completion can be inferred from this later output.

The harness now explicitly waits for the named **Turn Transition** dialog to leave when the next-turn indicator renders first. If another dialog remains, the test still fails closed and includes that dialog's accessible name and a bounded text excerpt in the error.

## Automated result after the transition-race remediation

The latest supplied Chromium run completed the diplomacy-heavy and balanced cases through Turn 20 in approximately 1.3 minutes each. The security-heavy case timed out before campaign entry after five minutes in `page.goto('/')` while waiting for `load`.

The retained trace shows successful local responses for the document, bundle, stylesheet, and hero image. It also shows the Lenis request to `cdn.jsdelivr.net` with no response (`status: -1`) for the duration of the test. Because that script was synchronously loaded in the document head, the failure prevented the rest of the page from parsing and prevented the Enter Arena handler from being installed. It does not establish a security-strategy simulation failure.

The working-tree remediation moves all three landing motion libraries behind the initial document load, gives each request a bounded timeout, renders landing content statically until motion is ready, and keeps mission entry operational when the CDNs are blocked. A focused no-CDN E2E case now pins that contract. The security-heavy Chromium case and the cross-browser matrix still require fresh verification; do not infer a three-strategy pass from the two completed cases.

## Automated result after the landing-motion fallback

The supplied verification output reported:

- static asset validation: **PASS**, 67 references validated
- GitHub Pages deployment contract: **PASS**
- TypeScript typecheck: **PASS**
- Vite production build: **PASS**, 257 modules transformed
- demo bundle budget: **PASS**, 1,231,203 raw bytes / 320,980 gzip bytes
- focused blocked-CDN mission-entry case: **PASS**, 1/1 Chromium test
- security-heavy Turn 20 deterministic guest-resume script: **PASS**, approximately 1.4 minutes
- diplomacy-heavy Turn 20 deterministic guest-resume script: **PASS**, approximately 1.2 minutes
- balanced Turn 20 deterministic guest-resume script: **PASS**, approximately 1.3 minutes

The three-strategy Chromium run completed 3/3 cases in approximately four minutes with one worker. This closes the Chromium automation blocker for the supplied working tree. It does not supply a commit SHA, stable Chrome evidence, stable Edge evidence, or the three signed human records, so production promotion remains blocked.

## Human-run commands

Build the exact candidate, then run the automated scripts against `dist`:

```powershell
npm ci
npm run build
npm run test:run -- tests/unit/eventsLoader.test.ts tests/unit/dialogueResolver.test.ts tests/unit/eventResolver.test.ts
npx playwright test --config=playwright.preview.config.ts --project=chromium tests/e2e/strategy-playthroughs.spec.ts --workers=1
npx playwright test --config=playwright.preview.config.ts --project=chrome tests/e2e/strategy-playthroughs.spec.ts --workers=1
npx playwright test --config=playwright.preview.config.ts --project=edge tests/e2e/strategy-playthroughs.spec.ts --workers=1
```

The operator must perform each script manually only after its automated run reaches and resolves Turn 20. Record per-turn action, key deltas, event/dialogue, save state, pacing, narrative clarity, console/page errors, final metrics/resources, ending, browser version, commit SHA, and PASS/FAIL under `dev_docs/demo_evidence/<YYYY-MM-DD>/`. An early ending, invalid action, deterministic mismatch, missing save, softlock, console error, or incomplete Turn 20 run is a FAIL and remains a release blocker.
