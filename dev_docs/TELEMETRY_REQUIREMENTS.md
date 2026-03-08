# Telemetry Requirements (Full Game)

Purpose
- Capture balance, difficulty, and narrative progression signals.
- Enable tuning and quality analysis without PII.

Per Turn Telemetry
- turn_number
- actions_chosen (action_id list)
- action_costs (budget, personnel, political_capital, intel_points, time_months)
- metric_deltas (stability, insurgency, civilian_support, global_legitimacy, regional_synergy)
- zone_threat_changes
- events_triggered and resolved
- corruption_flags_added

Per Act Telemetry
- act_number
- success_or_failure_state
- dominant_action_categories
- actor_relationship_shifts
- corruption_incident_count
- event_completion_rate

Per Campaign Telemetry
- ending_type
- final_metrics
- strategic_score
- strategic_score_v2_experimental (optional; telemetry-only)
- total_turns_used
- most_used_actions
- most_impacted_zones
- time_to_stabilize (first turn thresholds met)

Strategic Score
- strategic_score = round((stability + global_legitimacy) / 2)
- strategic_score is the official leaderboard score
- Optional telemetry-only:
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

Privacy and Storage
- Use session_id only (no PII)
- Encrypt at rest and in transit
- Respect opt-in analytics settings

