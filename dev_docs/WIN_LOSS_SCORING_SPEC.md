# Win/Loss & Strategic Scoring Specification (Full Game)

Purpose
- Provide a single, canonical source of truth for victory, failure, endings, and scoring.
- Applies to the 20-turn full campaign.

## Canonical Thresholds (Turn 20)
- stability >= 55
- insurgency <= 45
- civilian_support >= 50
- global_legitimacy >= 55
- regional_synergy >= 55

## Evaluation Order
1. Each turn (including Turn 20), run early-fail checks.
2. If any early-fail triggers, ending_type = mandate_revoked and the campaign ends immediately.
3. If Turn 20 completes without early-fail triggers, evaluate endgame thresholds and ending tiers.

## Failure Conditions (Early, Any Turn)
- 3 consecutive turns in the Critical band:
  - stability <= 24
  - insurgency >= 75
  - civilian_support <= 24
  - global_legitimacy <= 24
  - regional_synergy <= 24
- Any event with failure_on_deadline = true ignored past its deadline.
- time_months <= 0 before Turn 20 (immediate loss).
- Donor withdrawal and corruption exposure do not directly cause loss; they trigger penalties and narrative arcs only.

## Victory Conditions (Turn 20)
- All five canonical thresholds must pass (AND).
- time_months == 0 at the end of Turn 20 is allowed.
- If a 3-turn Critical streak completes on Turn 20, mandate_revoked overrides endgame success.

## Ending Types (Turn 20, If Not mandate_revoked)
Definitions:
- Critical metric (final 2 turns): any of the five metrics in the Critical band.
- High range (positive metrics only): 50-74 for stability, civilian_support, global_legitimacy, regional_synergy.
- Critical zone persistence: any zone with zoneThreat >= 75 in both turns 19 and 20.

Endings:
- strategic_success:
  - All thresholds met
  - No Critical metrics in turns 19-20
  - No Critical zone persistence in turns 19-20
- fragile_success:
  - All thresholds met
  - At least one positive metric in High range (50-74) OR any Critical metric in turns 19-20
- stalemate:
  - 1-2 thresholds missed
  - No Critical zone persistence in turns 19-20
- regional_setback:
  - 3+ thresholds missed OR Critical zone persistence in turns 19-20
- mandate_revoked:
  - Any early-fail trigger occurs (including a 3-turn streak that completes on Turn 20)

## ending_type Schema (string enum)
strategic_success | fragile_success | stalemate | regional_setback | mandate_revoked

## Strategic Scoring
Official leaderboard score:
- strategic_score = round((stability + global_legitimacy) / 2)

Optional telemetry-only score:
- insurgency_score = 100 - insurgency
- time_months_remaining = resources.time_months (current remaining months from runtime state)
- time_efficiency = clamp((time_months_remaining / time_months_total) * 100, 0, 100)
- strategic_score_v2_experimental = round(
    0.25 * stability +
    0.20 * global_legitimacy +
    0.15 * civilian_support +
    0.15 * regional_synergy +
    0.15 * insurgency_score +
    0.10 * time_efficiency
  )

## Scoring Bands (Leaderboards)
- S: 90-100
- A: 75-89
- B: 60-74
- C: 45-59
- D: 30-44
- F: 0-29

## Decision Matrix (Thresholds x Outcomes)
Legend: P = pass threshold, F = fail threshold

| Outcome | stability | insurgency | civilian_support | global_legitimacy | regional_synergy | Critical metrics in T19-20 | Critical zone persists (T19-20) |
|---|---|---|---|---|---|---|---|
| strategic_success | P | P | P | P | P | No | No |
| fragile_success | P | P | P | P | P | Yes OR any positive metric in High range (50-74) | No |
| stalemate | F(1-2 total) | F(1-2 total) | F(1-2 total) | F(1-2 total) | F(1-2 total) | Any | No |
| regional_setback | F(>=3 total) | F(>=3 total) | F(>=3 total) | F(>=3 total) | F(>=3 total) | Any | Yes OR >=3 thresholds missed |
| mandate_revoked | n/a | n/a | n/a | n/a | n/a | Any | Any |

## Test Cases
Victory Scenarios (Turn 20 evaluation)
1) Strategic Success:
   - Metrics: stability 78, insurgency 32, civilian_support 81, global_legitimacy 84, regional_synergy 77
   - Critical metrics in T19-20: No
   - Critical zones in T19-20: No
   - Expected ending_type: strategic_success
2) Fragile Success (High band present):
   - Metrics: stability 63, insurgency 40, civilian_support 76, global_legitimacy 80, regional_synergy 82
   - Critical metrics in T19-20: No
   - Critical zones in T19-20: No
   - Expected ending_type: fragile_success
3) Fragile Success (Critical metric in T19-20):
   - Turn 19: stability 22 (critical), Turn 20: stability 55, insurgency 44, civilian_support 62, global_legitimacy 70, regional_synergy 60
   - Critical metrics in T19-20: Yes
   - Critical zones in T19-20: No
   - Expected ending_type: fragile_success
4) Stalemate (2 thresholds missed):
   - Metrics: stability 52, insurgency 50, civilian_support 49, global_legitimacy 60, regional_synergy 55
   - Thresholds missed: insurgency, civilian_support
   - Critical zones in T19-20: No
   - Expected ending_type: stalemate
5) Regional Setback (Critical zone persistence override):
   - Metrics: stability 60, insurgency 40, civilian_support 70, global_legitimacy 75, regional_synergy 65
   - Critical zones in T19-20: Yes (any zone Critical both turns)
   - Expected ending_type: regional_setback

Failure Scenarios (Early exit before Turn 20)
1) Time expiry:
   - time_months <= 0 at end of Turn 19
   - Expected ending_type: mandate_revoked
2) 3-turn Critical streak (stability):
   - stability <= 24 at Turns 6-8
   - Expected ending_type: mandate_revoked
3) 3-turn Critical streak (insurgency):
   - insurgency >= 75 at Turns 10-12
   - Expected ending_type: mandate_revoked
4) failure_on_deadline:
   - event_id CAT_001 with failure_on_deadline = true missed past deadline on Turn 14
   - Expected ending_type: mandate_revoked
5) Turn 20 streak override:
   - stability <= 24 at Turns 18-20 (streak completes on Turn 20)
   - Expected ending_type: mandate_revoked (override endgame)

## Implementation Checklist
- [ ] Victory evaluation function signature and pseudocode
- [ ] Failure check function (called each turn, including Turn 20)
- [ ] Strategic score calculation function (v1 official, v2 telemetry-only)
- [ ] Ending type determination logic (including critical zone persistence override)
- [ ] UI display requirements for each outcome (banner, summary, rationale)
- [ ] Telemetry logging for win/loss analytics (ending_type, thresholds_missed_count, fail_reason)

## UI Display Requirements (Outcomes)
- strategic_success: "Strategic Success" banner, highlight metrics exceeding thresholds, emphasize no critical conditions.
- fragile_success: "Fragile Success" banner, highlight any high-band metric and note remaining vulnerabilities.
- stalemate: "Stalemate" banner, list which thresholds missed (1-2) and suggested focus areas.
- regional_setback: "Regional Setback" banner, show critical zone persistence or 3+ missed thresholds.
- mandate_revoked: "Mandate Revoked" banner, show fail_reason (time expiry, streak, failure_on_deadline).

## Placeholder: Catastrophic Event ID Tagging
Awaiting event list. Once available:
- Mark each catastrophic event with failure_on_deadline = true
- Include event_id list here for audit and testing:
  - [PENDING] CAT_###
  - [PENDING] CAT_###
  - [PENDING] CAT_###

## Cross-Document Verification (Status)
- CONTENT_DATA_REQUIREMENTS.md: win_conditions and fail_conditions match this spec.
- FULL_GAME_SYSTEM_DESIGN.md: victory thresholds and early-fail rules aligned; Turn 20 streak override added.
- FULL_GAME_LEVEL_DESIGN.md: win/loss thresholds aligned; scripted failure uses failure_on_deadline.
- FULL_GAME_NARRATIVE_DESIGN.md: ending types aligned; critical zone persistence defined as turns 19-20.
- TELEMETRY_REQUIREMENTS.md: strategic_score v1 aligned; v2 recorded as telemetry-only.

## Pseudocode (Evaluation)
```
if early_fail_triggered_this_turn:
  ending_type = "mandate_revoked"
  end_campaign()

if turn == 20:
  if thresholds_met_all():
    if critical_zone_persists(turn19, turn20): ending_type = "regional_setback"
    else if critical_metrics_in_turns(turn19, turn20): ending_type = "fragile_success"
    else if any_positive_metric_in_high_range(): ending_type = "fragile_success"
    else ending_type = "strategic_success"
  else if thresholds_missed_count() <= 2:
    if critical_zone_persists(turn19, turn20): ending_type = "regional_setback"
    else ending_type = "stalemate"
  else:
    ending_type = "regional_setback"
```
