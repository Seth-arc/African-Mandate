# Content Data Requirements (Full Game)

Purpose
- Defines the canonical, versioned content that drives gameplay, narrative, and UI.
- Read-only at runtime; loaded by the game engine.
 - All content keys use snake_case.

Versioning
- Every content pack must include: version (semver), schema_version, updated_at.

Core Content Packs
1) Game Config
- game_config:
  - acts: 5
  - turns_per_act: 4 (total_turns: 20)
  - action_slots_per_turn: 3
  - turn_duration_months: [2,2,2,2, 2,2,2,2, 2,2,2,2, 2,2,2,2, 1,1,1,1]
  - time_months_total: 48
  - default_action_cooldown_turns: 1
  - default_intel_gate: 10
  - starting_resources:
    - budget: 15000000
    - political_capital: 60
    - personnel: 2000
    - intel_points: 20
    - time_months: 48
  - starting_metrics:
    - stability: 42
    - insurgency: 58
    - civilian_support: 38
    - global_legitimacy: 50
    - regional_synergy: 45
  - time_months_rules:
    - Each turn consumes turn_duration_months[turn].
    - Action time_months costs also subtract from the same pool.
    - If time_months <= 0 before turn 20, the game ends in failure.

Note: starting_metrics are the authoritative campaign-start values and supersede any aggregation of territories.base_metrics for initial global metrics.

2) Win/Fail Rules
- win_conditions:
  - stability >= 55
  - insurgency <= 45
  - civilian_support >= 50
  - global_legitimacy >= 55
  - regional_synergy >= 55
- fail_conditions:
  - stability <= 24 for 3 consecutive turns
  - insurgency >= 75 for 3 consecutive turns
  - civilian_support <= 24 for 3 consecutive turns
  - global_legitimacy <= 24 for 3 consecutive turns
  - regional_synergy <= 24 for 3 consecutive turns
  - event with failure_on_deadline = true ignored past deadline
  - time_months <= 0 before turn 20 (immediate loss)

3) Territories (Countries)
- territories:
  - territory_key (unique)
  - name
  - population
  - coords (lat, lon)
  - base_metrics (stability, insurgency, civilian_support)
  - flag_url

4) Zones (Within Territories)
- zones:
  - zone_id (unique)
  - territory_key (FK)
  - name
  - zone_type
  - population
  - base_insurgency
  - base_stability
  - coords (lat, lon)

5) Actors
- actors:
  - actor_key (unique)
  - name
  - faction
  - type
  - profile
  - default_sentiment
  - default_relationship_score

6) Action Catalog
- actions:
  - action_id (unique)
  - name
  - category (security | diplomacy | humanitarian | governance_economic | climate | intelligence | community_mediation)
  - target_scope (zone | territory | actor)
  - costs:
    - budget: { min, max, step, default }
    - personnel: { min, max, step, default }
    - political_capital: { min, max, step, default }
    - intel_points: { min, max, step, default }
    - time_months: { min, max, step, default }
  - cost_notes:
    - Use min = max to represent fixed-cost actions.
    - Runtime caps allocations to available resource totals.
  - cooldown_turns (optional; defaults to game_config.default_action_cooldown_turns)
  - effects (metric deltas, actor shifts, flags)
  - effects.risks (optional):
    - civilian_harm_chance: deterministic 0.0-1.0 threshold resolved from turn + action + target seed
    - civilian_harm_effects: metric deltas applied only when the deterministic risk outcome fires
    - Fired civilian-harm outcomes append `civilian_harm_incident` to actions_log and feed the media civilian-harm event path.
  - delay_turns (optional; number of turns before delayed_effects resolve)
  - delayed_effects (optional; same schema as effects, applied after delay_turns)
  - intel_gate (optional; defaults to game_config.default_intel_gate); gates against `resources.intel_points`, not `ai_state.intel_confidence`
  - requirements.condition (optional restricted expression DSL): supports AND/OR combinations of comparisons against metrics, resources, ai_state, oversight_level, audit_status, turn, act, and narrative flags. Unsupported expressions fail content load.
  - corruption_risk.condition (optional restricted expression DSL): same evaluator as requirements.condition. When true, appends corruption_risk.flag to narrative flags and the action log.
  - note: community_mediation counts toward diplomacy and humanitarian analytics/category spam

7) Events and Narrative
- events:
  - event_id (unique)
  - event_type (crisis | narrative | system | intel | ui | tutorial)
  - category (security | corruption | humanitarian | coalition | external | climate | governance | narrative | system | ui)
  - priority (1-100; lower processed first)
  - trigger_conditions
  - trigger_turn
  - deadline_turn
  - deadline_offset (optional; turns after trigger to compute deadline when trigger_turn = 0)
  - failure_on_deadline (optional; bool; if true, missing deadline triggers immediate loss)
  - narrative_text_key
  - outcomes (effects, followup events, flags)
  - note: if trigger_turn = 0 and deadline_offset is provided, runtime computes deadline_turn = trigger_turn + deadline_offset at trigger time
- cutscenes:
  - cutscene_id (unique)
  - act
  - trigger_turn
  - media_url
  - text_key

8) Dialogues
- dialogues:
  - dialogue_id (unique)
  - actor_key (FK)
  - node_graph
  - choices (each with effects and flags)

9) Intel Reports
- intel_reports:
  - report_key (unique)
  - headline_key
  - body_key
  - urgency
  - sources (array of source keys or ids)

10) Corruption Content
- corruption_events:
  - corruption_id (unique)
  - trigger_conditions
  - consequences
  - mitigation_options

11) Localization
- locales:
  - language_code
  - content_id
  - text

12) Assets
- assets:
  - asset_id
  - type (image | audio | video)
  - path
  - alt_text_key

Relationships
- zones must reference a valid territory_key
- dialogues must reference valid actor_key
- events can reference actions, actors, or zones by key
