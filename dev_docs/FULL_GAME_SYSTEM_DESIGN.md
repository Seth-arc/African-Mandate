# African Mandate - Full Game System Design (MDA)

## Canonical Alignment (Full Game)
- Acts: 5 total, fixed order, 4 turns per act (20 turns total)
- Time model: 48 months total; Turns 1-16 are 2 months each, Turns 17-20 are 1 month each
- Actions per turn: 3; no carryover
- Metrics scale: all metrics are 0-100 (including regional_synergy)
- Win conditions (end of Act 5):
  - stability >= 55
  - insurgency <= 45
  - civilian_support >= 50
  - global_legitimacy >= 55
  - regional_synergy >= 55
- Early fail conditions:
  - stability <= 24 for 3 consecutive turns
  - insurgency >= 75 for 3 consecutive turns
  - civilian_support <= 24 for 3 consecutive turns
  - global_legitimacy <= 24 for 3 consecutive turns
  - regional_synergy <= 24 for 3 consecutive turns
  - Any event with failure_on_deadline = true ignored past its deadline
  - time_months <= 0 before turn 20 (immediate loss)
- Fail checks run every turn including Turn 20; if a 3-turn critical streak completes on Turn 20, Mandate Revoked overrides endgame evaluation

## MDA Mapping (System Design)
- Mechanics:
  - State schema and persistence
  - Action validation and resolution pipeline
  - AI director rules
  - Economy, caps, and constraints
- Dynamics:
  - System coupling and cascading outcomes
  - Escalation and de-escalation behavior
  - Strategy shifts based on AI countering
- Aesthetics:
  - High-stakes stewardship and consequence clarity

## System Map (Entities)
- Game session
- Resources and metrics
- AI state and escalation
- Territories and zones
- Actors and relationships
- Intel reports and feed items
- Actions log and outcome log
- Scenario rules and settings

## State Model (Minimum Fields)
- session:
  - turn (1-20), actions_remaining=action_slots_per_turn (3), max_turns=20 (derived)
  - act derived from turn (do not store)
  - resources: { budget, political_capital, personnel, intel_points, time_months }
  - metrics: { stability, insurgency, civilian_support, global_legitimacy, regional_synergy }
  - ai_state: { opposition_pressure, intel_confidence, actor_sentiments }
  - intel_layer_state: { militia, idp, illicit }
  - last_played_at
- territory_state:
  - territory_key, name, status, stability, insurgency, population, au_presence, coords
- zone_state:
  - zone_id, territory_key, threat_level, insurgency, population, displaced, threats, incidents, actors_present
- actor_sentiments:
  - actor_key, sentiment, relationship_score, relationship_label, stance, dialogue_state
  - canonical source for actor sentiment state; any map/view forms are derived
- intel_reports:
  - report_key, headline_text, body_text, sources, urgency
  - resolved from content data keys at load time
- intel_feed_items:
  - session_id, report_key, is_urgent, occurred_at, is_read
- actions_log:
  - session_id, turn
  - action_id, action_name, action_category
  - targets: { territories, zones, actors }
  - costs: { budget, personnel, political_capital, intel_points, time_months }
  - effects

## Action Resolution Pipeline
1) Validate action (costs, cooldowns, intel gates, target eligibility)
2) Pay costs (budget, political_capital, personnel, intel_points, time_months)
3) Apply effects (metrics, actors, zones)
4) Queue delayed_effects if delay_turns > 0 (store turn_due = current_turn + delay_turns)
5) Log action and outcomes (including any queued delayed_effects metadata)
6) Update UI, intel feed, and status report immediately
Notes:
- cooldowns and intel gates are per-action; if an action omits them, use game_config defaults
- Runtime timing: player actions and dialogue choices resolve immediately on commit. Per-turn drift, delayed effects whose `turn_due` is reached, event triggers/penalties, and AI director counter-pressure resolve only when the player clicks End Turn.
- Action log entries carry `resolution_timing`: `immediate_action`, `immediate_dialogue`, or `end_turn`.

## Territory Aggregation and Per-Turn Drift (Exact Formula)
- Zone weight: use numeric zone population if present, otherwise weight = 1
- Territory threat (Tthreat) = sum(weight * zoneThreat) / sum(weight)
- If a territory has no zones, fallback threat = 0.6 * insurgency + 0.4 * (100 - stability)
- Territory status uses the same Low/Moderate/High/Critical thresholds as zones
- Per-turn drift after actions and events resolve:
  - baseDelta = (50 - Tthreat) / 20
  - stability += baseDelta
  - insurgency -= baseDelta
  - criticalCount = number of zones with zoneThreat >= 75
  - stability -= min(criticalCount * 0.5, 2)
  - insurgency += min(criticalCount * 0.5, 2)
- Clamp stability and insurgency to 0-100 after drift

## AI Director (Rules)
- Inputs:
  - opposition_pressure, intel_confidence
  - actor relationship shifts
  - zone threat scores
  - recent action mix (last 4 turns)
- Rules:
- If same category used 3 times in 4 turns, AI counters and adds +10 pressure
- If stability < 45 for 2 turns, AI increases insurgent activity events
- If global_legitimacy < 45, AI increases diplomatic friction events
- If civilian_support < 45, AI injects unrest events

## Canonical Arc Triggers (External & Integrity)
- corruption_flags_count_act = count of corruption_flags with created_turn in the current act (derived)
- Corruption Exposure Arc: trigger if corruption_flags_count_act >= 2 OR audit_status == failed (narrative/economic arc only; not an auto-loss)
- Donor Conditionality Event (Act 4 checkpoint / Turn 15): trigger if corruption_flags_count_act >= 2 OR audit_status == failed OR global_legitimacy < 45; applies budget freeze/penalties only (not an auto-loss)
- Wagner Expansion Arc: trigger if global_legitimacy < 50 AND any junta relationship_score > 60

## Economy and Balance Knobs
- budget:
  - Base per act, donor inflow tied to global_legitimacy and stability
  - Emergency inflow after major humanitarian wins
- personnel:
  - Attrition increases with insurgency > 70
- political_capital:
  - Drops on civilian harm or broken agreements
  - Gains on successful diplomacy and humanitarian wins
- intel_points:
  - Gained via intel actions and cooperative actors
  - Spent to unlock advanced actions and reveal risks
- time_months:
  - Global time pool shared across turns and actions
  - Each turn consumes turn_duration_months[turn], plus action time_months costs
  - If time_months <= 0 before turn 20, trigger immediate failure

## Tribalism and Communal Fracture System
- Zone tags must include ethnic_composition (array of groups with weights)
- Event trigger (per zone):
  - If civilian_support < 50 AND insurgency > 60 AND ethnic_composition has > 1 group
  - Trigger Inter-Communal Violence event with 2-turn mediation deadline
- Mediation outcomes:
  - Success: civilian_support +6, stability +4, insurgency -4
  - Failure: civilian_support -8, stability -6, insurgency +6
- Mitigation actions write flags:
  - peace_council_active, joint_patrols_active, arbitration_active, cultural_liaisons_active
- Flags reduce escalation severity by 50% and reduce recurrence chance by 25%

## Telemetry (Full Game Balancing)
- Current public demo telemetry is local QA-only and opt-in; it is not durable production analytics.
- Per turn: action choices, validation failures, costs, metric deltas, crisis outcomes, and reveal timing.
- Per campaign: completion/abandonment, ending distribution, final metrics, save failures, accessibility mode use, and E2E-critical errors.
- Production telemetry remains blocked until a durable collector, retention policy, and operator monitoring are implemented.

## Strategic Score (Leaderboard)
- strategic_score = round((stability + global_legitimacy) / 2)
- strategic_score is the official leaderboard score
- Optional telemetry-only: strategic_score_v2_experimental (see TELEMETRY_REQUIREMENTS.md)
- Derived from current metrics; computed for leaderboard ranking

## Difficulty and Accessibility
- Difficulty modes: Narrative, Standard, Expert
  - Modify resource scarcity and event frequency
- Optional adaptive difficulty toggle
- Full keyboard navigation and scalable UI
- Captions, high contrast, and reduced motion options

## Invariants and Constraints
- Metrics always clamped to 0-100
- Resources never negative
- actions_remaining never > action_slots_per_turn (derived from game_config)
- turn never > max_turns
- intel_layer_state must contain militia, idp, illicit keys

## Integration Requirements
- All canonical content text stored as localization keys (runtime may cache resolved text)
- UTF-8 encoding enforced
- Logs must be append-only for auditability
