The intelligence reports need Executive Assessment copy is not visible in the modal


Operational Directive

## Sprint Backlog: Playability (MDA-Aligned)

### Epic E1: Turn Cadence and Fast Reveal
Story S1: As a player, I want each turn to resolve quickly so I stay in the decision loop without losing tension.
Acceptance Criteria:
1. Median `choose -> confirm -> reveal -> next decision` loop is between 60 and 90 seconds in playtests.
2. After seeing one full reveal, player can use `Fast Reveal` for future turns.
3. `Fast Reveal` still shows critical deltas for map, actors, metrics, and intel before returning control.
Telemetry event names:
- `turn_loop_started`
- `turn_loop_completed`
- `turn_loop_duration_ms`
- `reveal_mode_selected`
- `fast_reveal_used`

### Epic E2: Modal Friction Reduction
Story S2: As a player, I want consistent modal controls so I can act quickly without UI confusion.
Acceptance Criteria:
1. Every actionable modal has one visually dominant primary CTA.
2. Enter activates primary CTA when valid; Escape closes or steps back where safe.
3. Last selected action category and target are restored when reopening Take Action in the same turn.
Telemetry event names:
- `modal_opened`
- `modal_closed`
- `modal_primary_cta_clicked`
- `modal_escape_used`
- `take_action_state_restored`

### Epic E3: Pre-Confirm Forecast Clarity
Story S3: As a player, I want a clear forecast before confirming so choices feel strategic, not blind.
Acceptance Criteria:
1. Forecast card appears on review step for every action.
2. Forecast includes expected gains, likely risks, confidence tier, and affected zones, actors, and metrics.
3. Confirm button remains available, but forecast is visible without extra clicks.
Telemetry event names:
- `forecast_card_viewed`
- `forecast_confidence_rendered`
- `forecast_risk_rendered`
- `action_confirmed_from_review`
- `action_cancelled_from_review`

### Epic E4: Instant Consequence Legibility
Story S4: As a player, I want immediate visual deltas after confirm so I understand what changed and why.
Acceptance Criteria:
1. Reveal phase animates zone state changes and territory status changes on map.
2. Actor relationship deltas show with signed values (`+/-`) and tone badge.
3. Metric and resource deltas display signed values in the reveal summary.
Telemetry event names:
- `reveal_phase_started`
- `map_delta_animation_played`
- `actor_delta_shown`
- `metric_delta_shown`
- `reveal_phase_completed`

### Epic E5: Intel Readability and Uncertainty
Story S5: As a player, I want intel reliability signaled clearly so uncertainty feels intentional and playable.
Acceptance Criteria:
1. Intel items use confidence tiers (`Confirmed`, `Probable`, `Contested`) in feed and tooltips.
2. Map visuals differ by confidence tier and urgency.
3. Zone-scoped intel remains visible even when Zones layer is toggled off.
Telemetry event names:
- `intel_item_rendered`
- `intel_confidence_tier_rendered`
- `intel_zone_overlay_rendered`
- `intel_pin_clicked`
- `intel_report_opened`

### Epic E6: Informative Loading and Reveal Transitions
Story S6: As a player, I want transition time to communicate progress so cinematic loading does not feel empty.
Acceptance Criteria:
1. Action and end-turn loading screens display rotating status lines for resolution stages.
2. Status lines map to actual backend/system phases (metrics, relationships, territory, intel).
3. Loading transitions complete without blocking final reveal interaction.
Telemetry event names:
- `transition_loading_started`
- `transition_status_line_shown`
- `transition_phase_advanced`
- `transition_loading_completed`
- `transition_loading_duration_ms`

### Epic E7: Anti-Dominant Strategy Adaptation
Story S7: As a player, I want the opposition to adapt to repetitive strategies so each turn stays interesting.
Acceptance Criteria:
1. Repeating one action category triggers diminishing returns by configured threshold.
2. Counter-move events can trigger in relevant zones after repetition threshold.
3. UI communicates adaptation trigger before and during resolution.
Telemetry event names:
- `action_category_repetition_detected`
- `diminishing_returns_applied`
- `counter_move_triggered`
- `adaptation_warning_shown`
- `counter_move_zone_affected`

### Epic E8: Fail-Forward Recovery
Story S8: As a player, I want limited recovery options after mistakes so failure teaches without hard-stalling progress.
Acceptance Criteria:
1. One reconsider opportunity per turn is available before end-turn lock.
2. If reconsider is unused, low-cost corrective actions are available after adverse outcomes.
3. Recovery actions are clearly labeled as mitigations, not full reversals.
Telemetry event names:
- `reconsider_available`
- `reconsider_used`
- `reconsider_expired`
- `corrective_action_suggested`
- `corrective_action_taken`

### Epic E9: Onboarding to First Meaningful Decision
Story S9: As a new player, I want to reach a meaningful choice quickly so onboarding supports play instead of delaying it.
Acceptance Criteria:
1. First meaningful action can be taken within 180 seconds for median first-time users.
2. Lore-heavy content is available in optional expandable panels, not mandatory blocking flow.
3. Onboarding clearly explains one turn loop before full system detail.
Telemetry event names:
- `onboarding_started`
- `onboarding_step_completed`
- `onboarding_skipped`
- `first_meaningful_action_taken`
- `time_to_first_meaningful_action_ms`

### Epic E10: Playability Telemetry and Rebalancing
Story S10: As a designer, I want decision-loop telemetry so we can tune mechanics, dynamics, and player experience with evidence.
Acceptance Criteria:
1. Dashboard-ready event stream includes timing, action diversity, modal friction, and churn points.
2. Playtest survey captures "I understand what changed" response after reveals.
3. Rebalancing review cadence is defined and uses telemetry snapshots per build.
Telemetry event names:
- `turn_completed`
- `turn_duration_ms`
- `action_diversity_index`
- `modal_reopen_count`
- `player_quit_point`
- `understood_changes_response`

## Sprint Backlog: Traditional/Linear Storytelling (Mod 6 Aligned)

### Epic E11: Three-Act Narrative Spine for Act 1
Story S11: As a player, I want a clear beginning, middle, and end so I understand what the campaign conflict is and why my actions matter.
Acceptance Criteria:
1. Act 1 includes a clear inciting incident, mid-act escalation, and closing resolution state.
2. Mission Brief and Status Report explicitly state current act objective and conflict status.
3. Two major reversals are defined in campaign content (end of early and mid progression beats).
Telemetry event names:
- `narrative_inciting_incident_shown`
- `narrative_reversal_triggered`
- `act_objective_presented`
- `act_state_updated`

### Epic E12: Cause-and-Effect Story Logic
Story S12: As a player, I want story beats to feel earned, with events happening because of prior actions and outcomes.
Acceptance Criteria:
1. Every authored narrative beat references at least one triggering state condition (flag, relationship threshold, metric band, or territory state).
2. No critical story beat is advanced by unrelated events without a causal trigger.
3. Status Report timeline can show the triggering cause for each major beat.
Telemetry event names:
- `narrative_beat_triggered`
- `narrative_beat_trigger_source_recorded`
- `narrative_timeline_entry_added`

### Epic E13: Scene State-Change Requirement
Story S13: As a player, I want each story scene to change the game state so scenes feel meaningful.
Acceptance Criteria:
1. Each narrative scene modifies at least one tracked state element (flag, relationship, metric, territory status, unlock).
2. Scenes that produce zero deltas are rejected from production content.
3. Scene summary UI displays what changed immediately after scene completion.
Telemetry event names:
- `narrative_scene_started`
- `narrative_scene_completed`
- `narrative_scene_delta_count`
- `narrative_scene_no_change_flagged`

### Epic E14: Agency-Preserving Major Beats
Story S14: As a player, I want major plot turns to reflect my choices rather than feeling externally imposed.
Acceptance Criteria:
1. Major campaign turns are resolved through player-driven actions or choice branches whenever possible.
2. If a cutscene is used, its variant reflects prior player decisions.
3. Main conflict resolution cannot be delivered purely as a deus-ex-machina outcome.
Telemetry event names:
- `major_story_beat_started`
- `major_story_beat_interactive_resolution`
- `cutscene_variant_selected`
- `player_choice_influenced_story_outcome`

### Epic E15: Character Through Conflict
Story S15: As a player, I want actor personalities to be shown through conflict decisions, not only described in dialogue.
Acceptance Criteria:
1. Key actors have conflict-driven interaction beats with meaningful tradeoffs.
2. Relationship thresholds unlock or lock diplomatic paths in ways the player can observe.
3. Character shifts are reflected in both narrative text and relationship matrix deltas.
Telemetry event names:
- `character_conflict_choice_presented`
- `relationship_threshold_crossed`
- `diplomatic_path_unlocked`
- `diplomatic_path_locked`

### Epic E16: Story-Gameplay Coherence (Ludonarrative Alignment)
Story S16: As a player, I want story themes and gameplay systems to reinforce each other.
Acceptance Criteria:
1. Core gameplay actions are mapped to narrative theme intent in design docs.
2. High-stakes narrative moments align with high-impact gameplay states.
3. Any identified story-mechanic contradiction is logged and resolved before release candidate.
Telemetry event names:
- `theme_mechanic_alignment_reviewed`
- `high_stakes_gameplay_state_reached`
- `ludonarrative_conflict_detected`
- `ludonarrative_conflict_resolved`

### Epic E17: Embedded and Emergent Narrative Integration
Story S17: As a player, I want authored story and my own play-generated story to feel connected.
Acceptance Criteria:
1. End-of-turn recap includes both authored narrative progression and player-caused emergent outcomes.
2. Status Report shows a chronological chain of "action -> consequence -> narrative implication".
3. Recap language references concrete in-game deltas (actors, territories, metrics, intel).
Telemetry event names:
- `turn_recap_generated`
- `emergent_narrative_entry_added`
- `embedded_narrative_entry_added`
- `action_consequence_story_link_recorded`

### Epic E18: Story Delivery Supports Gameplay Pace
Story S18: As a player, I want story context quickly, without blocking core decision-making flow.
Acceptance Criteria:
1. First meaningful decision remains reachable within 180 seconds while still delivering conflict setup.
2. Lore depth is available through optional expandable content and dossiers.
3. Required story beats are concise and skippable after first viewing where safe.
Telemetry event names:
- `time_to_first_meaningful_action_ms`
- `required_story_beat_viewed`
- `story_beat_skipped`
- `optional_lore_panel_opened`

## Sprint Backlog: Interesting Decisions + UI/UX (Mod 9 + Mod 13 Aligned)

### Epic E19: Decision Quality Guardrails
Story S19: As a player, I want my choices to be meaningful and informed so strategy feels intentional, not arbitrary.
Acceptance Criteria:
1. Decision points are classified as meaningful tradeoff, emotional flavor, obvious, or blind; obvious/blind cases are either redesigned or intentionally justified.
2. No mandatory "fake choice" loops remain in core flow unless marked as narrative flavor and skippable.
3. Blind decisions in core flow must show at least one relevant signal before commit (forecast, map cue, actor cue, or intel cue), or be auto-resolved.
Telemetry event names:
- `decision_point_presented`
- `decision_type_classified`
- `decision_blind_signal_shown`
- `decision_auto_resolved`
- `decision_outcome_delta_recorded`

### Epic E20: Tradeoff-Centered Action Design
Story S20: As a player, I want each strong option to carry a real cost so no single strategy dominates.
Acceptance Criteria:
1. High-frequency actions expose at least one explicit tradeoff axis (risk/reward, short-term vs long-term, or resource exchange).
2. Action review UI surfaces opportunity cost ("what this choice delays or forgoes") for strategic actions.
3. Dominant-strategy checks are run each balance pass; if one action category exceeds target pick-rate thresholds without state justification, balancing tasks are created.
Telemetry event names:
- `tradeoff_axis_rendered`
- `opportunity_cost_rendered`
- `risk_reward_profile_selected`
- `delayed_payoff_option_selected`
- `dominant_strategy_threshold_exceeded`

### Epic E21: Agency and Consequence Feedback
Story S21: As a player, I want to form a plan and see whether it is working so I feel in control of outcomes.
Acceptance Criteria:
1. Major decisions produce immediate post-action feedback across map, actor, and metric channels where applicable.
2. Consequence surfaces include a clear "why this happened" trace from trigger to outcome.
3. At least three persistent indicators support plan-tracking across turns (for example pressure, actor stance, and territory trend).
Telemetry event names:
- `plan_intent_set`
- `feedback_channel_emitted`
- `consequence_trace_rendered`
- `plan_progress_indicator_viewed`
- `player_agency_self_reported`

### Epic E22: Mental Model Alignment and Progressive Disclosure
Story S22: As a player, I want controls and UI behavior to match expectations so I can learn quickly and execute confidently.
Acceptance Criteria:
1. Core interactions use consistent control semantics across screens (same intent, same key/button behavior).
2. New systems are introduced with progressive disclosure (small initial surface area, then expanded depth).
3. First-time users can complete one full decision loop without external instructions in usability sessions.
Telemetry event names:
- `control_semantic_used`
- `progressive_disclosure_step_seen`
- `first_loop_without_help_completed`
- `control_mismatch_reported`
- `ui_confusion_point_logged`

### Epic E23: Accessibility and Visual Semantics
Story S23: As a player, I want critical information to be readable and distinguishable regardless of visual differences.
Acceptance Criteria:
1. Critical states are never encoded by color alone; shape/text/icon support is required.
2. Key HUD and modal state signals pass colorblind simulation checks for distinguishability.
3. Iconography is consistent and tooltips exist for non-obvious symbols.
Telemetry event names:
- `accessibility_check_passed`
- `color_only_signal_flagged`
- `icon_tooltip_viewed`
- `contrast_issue_reported`
- `accessibility_mode_toggled`

### Epic E24: UI Feedback Clarity and Game Feel
Story S24: As a player, I want interactions to feel responsive and clear so execution feels satisfying.
Acceptance Criteria:
1. High-impact interactions provide at least two feedback channels (visual, audio, haptic, motion).
2. Primary interaction feedback starts within 100 ms for local UI actions.
3. Reduced-motion and reduced-intensity options are available for high-effect sequences.
Telemetry event names:
- `feedback_channels_triggered`
- `feedback_latency_ms`
- `interaction_confirmation_rendered`
- `reduced_motion_enabled`
- `ui_feedback_satisfaction_captured`
