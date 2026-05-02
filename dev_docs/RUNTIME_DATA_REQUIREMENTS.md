# Runtime Data Requirements (Full Game)

Purpose
- Captures per-session state and player progress.
- Mutates each turn and on player actions.

Session Core
- session:
  - session_id
  - user_id (nullable for guest)
  - turn (1-20)
  - actions_remaining (0-3, derived from action_slots_per_turn)
  - max_turns (20, derived)
  - last_played_at
  - schema_version
  - act derived from turn (do not store)

Resources (JSONB or structured columns)
- resources:
  - budget
  - political_capital
  - personnel
  - intel_points
  - time_months (remaining global pool; decreases by turn duration and action costs)

Metrics (JSONB or structured columns)
- metrics:
  - stability
  - insurgency
  - civilian_support
  - global_legitimacy
  - regional_synergy

AI State
- ai_state:
  - opposition_pressure
  - intel_confidence
  - actor_sentiments (derived view only; map actor_key -> {sentiment, relationship_score, relationship_label, stance, dialogue_state})

Intel Layer State
- intel_layer_state:
  - militia
  - idp
  - illicit

Territory State (Per Session)
- territory_state:
  - session_id
  - territory_key
  - name
  - stability
  - insurgency
  - status
  - population
  - au_presence
  - coords

Zone State (Per Session)
- zone_state:
  - session_id
  - zone_id
  - territory_key
  - stability
  - insurgency
  - civilian_support (zone-scoped metric; 0-100)
  - threat_level
  - population
  - displaced
  - threats
  - incidents
  - actors_present

Actor Sentiments (Per Session)
- actor_sentiments:
  - session_id
  - actor_key
  - sentiment
  - relationship_score
  - relationship_label
  - stance
  - dialogue_state
  - canonical source for actor sentiment state; any maps/views are derived from these records

Intel Reports (Resolved for Runtime/UI)
- intel_reports:
  - session_id
  - report_key
  - headline_text
  - body_text
  - sources (array of strings)
  - urgency
  - Note: resolved from headline_key, body_key, and sources[] in content data

Intel Feed Items (Per Session)
- intel_feed_items:
  - session_id
  - report_key
  - is_urgent
  - occurred_at
  - is_read

Events and Logs
- active_events:
  - session_id
  - event_id
  - trigger_turn
  - deadline_turn
  - failure_on_deadline (bool; derived from content data)
  - status
- actions_log:
  - session_id
  - turn
  - action_id
  - action_name
  - action_category
  - targets (territories, zones, actors)
  - costs (budget, personnel, political_capital, intel_points, time_months)
  - effects
  - flag_additions (including authored flags, corruption-risk flags, and deterministic risk flags)
  - risk_outcomes (optional array):
    - type (`civilian_harm`)
    - applied (boolean)
    - roll (deterministic 0.0-1.0 value)
    - threshold
    - metric_deltas
    - flag_additions
    - media_event_key (`media_civilian_harm_report` when applied)
- status_report:
  - session_id
  - turn
  - summary

Corruption Runtime
- corruption_flags:
  - session_id
  - flag_id
  - severity
  - created_turn
- oversight_level:
  - session_id
  - level (none | basic | strong)
- audit_status:
  - session_id
  - status (pending | passed | failed)

Narrative Flags (Per Session)
- narrative_flags:
  - session_id
  - flag_key (string identifier, e.g., "wagner_active", "coalition_formed", "junta_challenged")
  - value (boolean; true if set)
  - set_on_turn (turn when flag was set)
  - source_event_id (event that set the flag, nullable)
  - Note: Flags persist for session duration unless explicitly cleared by an event effect

Canonical Accessor Paths (For Trigger Evaluation)
- The trigger evaluation engine uses canonical paths to access runtime state:
  - turn → session.turn
  - act → derived from turn (1-4→1, 5-8→2, 9-12→3, 13-16→4, 17-20→5)
  - metrics.<metric> → metrics.stability, metrics.insurgency, metrics.civilian_support, metrics.global_legitimacy, metrics.regional_synergy
  - resources.<resource> → resources.budget, resources.political_capital, resources.personnel, resources.intel_points, resources.time_months
  - flags.<flag> → narrative_flags where flag_key = <flag> and value = true
  - corruption_flags.<flag_id> → corruption_flags where flag_id = <flag_id>, return status (active | resolved | none)
  - actor_sentiments.<actor_key>.relationship_score → actor_sentiments where actor_key = <actor_key>
  - actor_sentiments.<actor_key>.relationship_label → derived from relationship_score (hostile: 0-20, adversarial: 21-40, neutral: 41-60, cooperative: 61-80, allied: 81-100)
  - oversight_level.level → oversight_level.level
  - audit_status.status → audit_status.status
  - zone.<field> → (scoped access) when event/trigger has zone scope, evaluates against current zone; valid fields: stability, insurgency, civilian_support, threat_level, population, multi_ethnic
  - zone.<zone_id>.<metric> → (explicit access) zone_state where zone_id = <zone_id>, return <metric> (stability, insurgency, civilian_support, threat_level)
  - zone.<zone_id>.multi_ethnic → zones where zone_id = <zone_id>, return multi_ethnic (static content)
  - territory.<territory_key>.<metric> → territory_state where territory_key = <territory_key>, return <metric>
  - active_events contains <event_id> → active_events where event_id = <event_id> and status != 'resolved'
  - rng → deterministic float 0.0-1.0 seeded per event/turn (see game_config.rng_config)

  Derived Signals (Computed at Runtime)
  - climate_actions_in_act2: Count of climate actions taken in Act 2
    - Formula: count(actions_log WHERE action_category == 'climate' AND turn IN [5,6,7,8])
  - idp_zones_stabilized: Count of zones with displaced > 0 that are now threat_level <= 49
    - Formula: count(zone_state WHERE displaced > 0 AND threat_level <= 49)
  - humanitarian_aid_spend_high: Boolean flag when humanitarian spend exceeds configured threshold in last 2 turns
    - Formula: sum(actions_log.costs.budget WHERE action_category == 'humanitarian' AND turn >= current_turn - 1) > 3000000
  - security_actions_without_oversight: Count of security actions taken while oversight_level.level == 'none' in last 3 turns
    - Formula: count(actions_log WHERE action_category == 'security' AND turn >= current_turn - 2 AND oversight_level_at_turn == 'none')
  - civilian_harm_incidents: Count of civilian harm incidents recorded in last 2 turns
    - Formula: count(actions_log WHERE flag_additions contains 'civilian_harm_incident' AND turn >= current_turn - 1)
  - intel_report_age_turns: Integer age of current featured intel report
    - Formula: current_turn - intel_reports[featured].created_turn
  - intel_report_generated: Boolean flag when a new intel report is generated this turn
  - intel_report_upgrade: Boolean flag when an intel report is upgraded this turn
  - corruption_flags_count_act: Count of active corruption flags in current act
    - Formula: count(corruption_flags WHERE created_turn IN current_act_turns)
  - corruption_unresolved: Boolean flag when any corruption event is active and unresolved
    - Formula: exists(active_events WHERE category == 'corruption' AND status != 'resolved')

  Junta Actor Definitions (for derived signal computation)
  - junta_actors: ["junta_burkina_traore", "junta_mali", "junta_niger"]
    - These actor_keys are used to compute junta-related derived signals

  - any_junta_relationship: Max relationship_score across junta actors
    - Formula: max(actor_sentiments[actor].relationship_score FOR actor IN junta_actors)
  - junta_allied_count: Count of junta actors with relationship_score > 60
    - Formula: count(actor_sentiments[actor].relationship_score > 60 FOR actor IN junta_actors)
  - turns_since_phase1: Turns since external_wagner_expansion_phase1 triggered
    - Formula: current_turn - narrative_flags['wagner_expansion_active'].set_on_turn (0 if flag not set)
  - coalition_compact: Enum 'success' | 'failure' (derived from coalition summit outcome)
    - Formula: if narrative_flags['coalition_compact_success'] then 'success' elif narrative_flags['coalition_compact_failure'] then 'failure' else null

  AI Director & Event Trigger Signals
  - category_spam: Boolean flag when any action category used 3+ times in last 4 turns
    - Formula: exists(category WHERE count(actions_log.action_category == category AND turn >= current_turn - 3) >= 3)
  - negotiation_actions_in_last_2_turns: Count of negotiation-tagged actions in last 2 turns
    - Formula: count(actions_log WHERE 'negotiation' IN action.tags AND turn >= current_turn - 1)
  - adjacent_zones_critical: Count of adjacent zone pairs where both have zoneThreat >= 75
    - Formula: count(zone_pairs WHERE zone_a.zoneThreat >= 75 AND zone_b.zoneThreat >= 75 AND adjacent(zone_a, zone_b))
  - unresolved_crisis_count: Count of active crisis events not yet resolved
    - Formula: count(active_events WHERE event_type == 'crisis' AND status != 'resolved')

  Win/Loss Evaluation Signals (computed at turn end)
  - thresholds_met_all: Boolean flag when all 5 win thresholds are met
    - Formula: stability >= 55 AND insurgency <= 45 AND civilian_support >= 50 AND global_legitimacy >= 55 AND regional_synergy >= 55
  - thresholds_missed_count: Count of win thresholds not met (0-5)
    - Formula: count of thresholds where condition fails
  - critical_metrics_in_t19_t20: Boolean flag when any metric was in Critical band during turns 19-20
    - Formula: exists(metric_history WHERE turn IN [19,20] AND (stability <= 24 OR insurgency >= 75 OR civilian_support <= 24 OR global_legitimacy <= 24 OR regional_synergy <= 24))
  - critical_zone_persists: Boolean flag when any zone has zoneThreat >= 75 in both turns 19 and 20
    - Formula: exists(zone WHERE zone_history[turn=19].zoneThreat >= 75 AND zone_history[turn=20].zoneThreat >= 75)
  - any_positive_metric_high_range: Boolean flag when any positive metric is in High range (50-74)
    - Formula: (stability IN [50,74]) OR (civilian_support IN [50,74]) OR (global_legitimacy IN [50,74]) OR (regional_synergy IN [50,74])
  - early_fail_triggered: Boolean flag when any early fail condition has triggered
    - Formula: any 3-consecutive-turn critical streak OR failure_on_deadline event missed OR time_months <= 0 before turn 20
  - endgame_evaluated: Boolean flag set after Turn 20 evaluation completes

  - donor_confrontation: Boolean narrative flag (set by donor interaction outcomes)
  - donor_conditions_unmet: Boolean narrative flag (set when conditionality requirements fail)
  - donor_compliance_full: Boolean narrative flag (set when conditionality requirements fully met)
  - anti_corruption_monitoring_active: Boolean narrative flag
  - mopti_security_ceasefire: Boolean narrative flag
  - mediation_action_success: Boolean narrative flag
  - splinter_negotiation_failed: Boolean narrative flag
  - whistleblower_reported: Boolean narrative flag
  - whistleblower_ignored: Boolean narrative flag
  - whistleblower_silenced: Boolean narrative flag
  - civil_society_rejected: Boolean narrative flag
  - humanitarian_corridor_open: Boolean narrative flag
  - humanitarian_major_win: Boolean narrative flag
  - tutorial_complete: Boolean UI/tutorial flag
  - ui_event: String event name for telemetry triggers (ui/tut only)

Preferences (Optional)
- difficulty_mode
- accessibility_settings
- notification_settings
