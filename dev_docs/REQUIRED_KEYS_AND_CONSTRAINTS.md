# Required Keys and Constraints (Full Game)

Naming Convention
- All data keys and telemetry fields use snake_case.

Unique Keys (Global)
- territory_key
- zone_id
- actor_key
- action_id
- event_id
- dialogue_id
- report_key
- cutscene_id

Referential Integrity
- zones.territory_key must exist in territories
- dialogues.actor_key must exist in actors
- events may reference only existing actors, zones, territories, or actions
- action targets must match their target_scope

Bounds and Clamps
- All metrics must remain within 0-100
- All resources must be >= 0
- actions_remaining <= action_slots_per_turn (derived from game_config)
- turn <= max_turns

Turn and Act Rules
- total_turns = 20
- turns_per_act = 4
- act is derived from turn: act = floor((turn - 1) / 4) + 1 (do not store act separately)

Critical Thresholds (Core Metrics)
- stability <= 24 is Critical (low)
- insurgency >= 75 is Critical (high)
- civilian_support <= 24 is Critical (low)
- global_legitimacy <= 24 is Critical (low)
- regional_synergy <= 24 is Critical (low)

Action Category Taxonomy
- security, diplomacy, humanitarian, governance_economic, climate, intelligence, community_mediation
- `community_mediation` actions count toward diplomacy/humanitarian analytics and category spam checks (i.e., they increment both diplomacy and humanitarian counters) to keep AI Director logic and telemetry alignment intact.

Action Cost Schema
- costs use ranged allocations with canonical keys: min, max, step, default
- Use min = max for fixed-cost actions
- Runtime allocations must be capped by available resource totals

Threat Level Bands
- Low 0-24, Moderate 25-49, High 50-74, Critical 75-100

Territory Status Labels
- low, moderate, high, critical (same thresholds as Threat Level Bands)

Corruption Flags
- Corruption flags must include: flag_id, severity, created_turn
- If 2 corruption flags occur in one act, trigger Corruption Exposure Arc

Dialogue Constraints
- Each dialogue node must have exactly 4 choices
- Each choice must apply at least one metric delta and one relationship delta
- Exception: briefings or dialogues with non-relationship actors (no actor_sentiments entry / default_relationship_score N/A) do not require relationship deltas; choices may be informational and may omit metric deltas (use resource deltas and/or narrative flags when applicable)

Event Constraints
- Events with deadlines must have explicit trigger_turn and deadline_turn, OR trigger_turn == 0 with deadline_offset (runtime computes deadline as trigger_turn + deadline_offset)
- Events that can cause immediate loss must set failure_on_deadline = true
- Missed deadlines must define a penalty bundle

Action Log (Canonical)
- session_id, turn
- action_id, action_name, action_category
- targets: { territories, zones, actors }
- resolution_timing: immediate_action | immediate_dialogue | end_turn
- costs: { budget, personnel, political_capital, intel_points, time_months }
- effects

Localization
- All canonical content text must be stored as localization keys (runtime may cache resolved text)
- UTF-8 encoding for all text assets
