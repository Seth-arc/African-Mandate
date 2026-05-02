# African Mandate - Run of Show

## Phase 1: Landing & Onboarding
**Trigger:** Player navigates to africanmandate.org and the landing page loads.  
**Conditional Variations:**  
- If `{session_id}` exists, show "Continue Mandate" with last played timestamp; clicking opens a resume picker if multiple sessions exist.  
- If multiple sessions exist, show a session list sorted by `{last_played_at}` (most recent first) with "Resume" and "Start New Campaign" options.  
**UI Elements:**  
- Full-bleed cinematic hero with GSAP parallax, text masking, and grain overlay.  
- Prestige headline in Playfair Display; subhead in Inter.  
- Primary CTA: "Enter Situation Room" (routes to Phase 2).  
- Secondary CTA: "View Mandate Briefing" (opens read-only briefing overlay, then routes to Phase 2).  
**Player Experience Summary:** Player sees the AU-led mandate framing and enters the tactical situation room.  
**System Notes:** No runtime state yet; landing assets referenced via `{assets}` pack. Base landing behavior maps to `index.html`; 

## Phase 2: Session Start / Identity & Preferences
**Trigger:** Player selects primary CTA to start a new mandate or continue.  
**Conditional Variations:**  
- If authenticated: resume `{session_id}` and load `{session.state}`.  
- If guest: create `{session_id}` with `{user_id: null}`.  
- If analytics opt-in: enable telemetry; otherwise disable. `{notification_settings}`.  
**UI Elements:**  
- Modal or full-screen panel for "New Campaign" vs "Continue".  
- Session picker list when multiple sessions exist (last played time, act/turn, and summary status).  
- Preferences toggles: `{difficulty_mode}` (Narrative/Standard/Expert), accessibility options (high contrast, reduced motion).  
- Tooltip copy for data privacy (opt-in).  
**Player Experience Summary:** Player chooses a campaign start mode and adjusts difficulty/accessibility.  
**System Notes:**  
- Initialize `{session}` with `{turn: 1}`, `{actions_remaining: 3}`, `{resources}`, `{metrics}`, `{ai_state}`, `{intel_layer_state}` per runtime defaults.  
- `{resources}` initialized from `game_config.starting_resources` (budget, political_capital, personnel, intel_points, time_months).  
- `{metrics}` initialized from `game_config.starting_metrics` (all five metrics).  
- `{ai_state}` defaults: `{opposition_pressure: 0}`, `{intel_confidence: 50}`, `{actor_sentiments}` initialized from `actors.default_relationship_score` with derived `relationship_label`, `stance`, `sentiment`, and `dialogue_state`.  
- Difficulty modifiers: Narrative = resources * 1.2, event frequency * 0.8; Standard = 1.0; Expert = resources * 0.8, event frequency * 1.2.  
- Leaderboard visibility gated by telemetry opt-in.

## Phase 3: Tutorial / Mandate Briefing
**Trigger:** First-time session (`{turn: 1}` and `{tutorial_complete: false}`) or "Mission Brief" header button.  
**Conditional Variations:**  
- If returning player, skip tutorial and load the Situation Room directly.  
- If `{difficulty_mode: Narrative}`, show extra guidance overlays.  
**UI Elements:**  
- Briefing modal overlay with AU mission framing and core loop steps.  
- Contextual callouts pointing to header counter, resource panel, intel feed, map, action bar.  
- "Begin Turn" button; hover state glow.  
- Optional "Skip Tutorial" link (sets tutorial_complete and routes to Phase 5).  
**Player Experience Summary:** Player learns the core loop: review intel, select actions (up to 3), resolve outcomes, end turn.  
**System Notes:** Tutorial should reference `{actions_remaining}`, `{turn}`, `{act}`, `{metrics.*}`, `{resources.*}`. Completion sets `{tutorial_complete: true}` and routes to Phase 5.

## Phase 4: Campaign Setup (Single Campaign)
**Trigger:** Post-tutorial "Begin" action.  
**UI Elements:**  
- Scenario confirmation card for "Sahel Arena" with act count (5), total turns (20), time model (48 months).  
- "Start Campaign" button with gold accent.  
**Player Experience Summary:** Player confirms the Sahel Arena campaign and starts Act 1.  
**System Notes:** Apply `{game_config}`: `{acts: 5}`, `{turns_per_act: 4}`, `{action_slots_per_turn: 3}`, `{turn_duration_months[]}`, `{time_months_total: 36}`.

## Phase 5: Situation Room - Turn Start (Core Gameplay Frame)
**Trigger:** Campaign start or after "End Turn" resolution.  
**Conditional Variations:**  
- If `{actions_remaining: 0}`, disable action bar and highlight "End Turn."  
- If `{time_months} <= 0`, jump to failure endgame.  
**UI Elements:**  
- **Header:** AU branding, `{act}` and `{turn}` counter, "ACTIONS REMAINING {actions_remaining}/{action_slots_per_turn}", buttons: "Mission Brief," "Leaderboard," "Status Report."  
- **Left Sidebar:** Resource panel `{budget}`, `{political_capital}`, `{personnel}`, `{intel_points}`; progress bars for `{stability}`, `{insurgency}`, `{civilian_support}`, `{global_legitimacy}`, `{regional_synergy}`.  
- **Center:** Leaflet tactical map with zone overlays colored by `{stability}` / `{threat_level}`; pulsing critical markers; scenario panel with tactical tags (e.g., "CRITICAL SITUATION") and territory details.  
- **Right Sidebar:** Intel feed `{intel_feed_items}` with urgency badges; actor panel with sentiment meters `{actor_sentiments}`.  
- **Action Bar:** "Investigate" (Intelligence), "Secure" (Security), "Negotiate" (Diplomacy), plus "Action Catalog" for all categories.  
**Player Experience Summary:** Player reviews live metrics, map conditions, and intel to plan the turn.  
**System Notes:**  
- `{act}` derived: `floor(({turn}-1)/4)+1`.  
- `{zoneThreat}` and `{Tthreat}` derived for labels `{threat_level}`.  
- `actions_remaining` resets to 3 at new turn start.

## Phase 6: Intel & Actor Engagement (Deep Dive)
**Trigger:** Player clicks an intel feed item or selects an actor.  
**Conditional Variations:**  
- If `{intel_points} < action.intel_gate` (default 10), lock the action with tooltip.  
- Dialogue options gated by `{relationship_score}`, `{intel_points}`, `{political_capital}`.  
**UI Elements:**  
- Intel report modal (headline/body text resolved from `{intel_reports}` keys).  
- Dialogue modal with 4 choices; show metric and relationship deltas for relationship-tracked actors, and informational effects/flags for institutional briefings.  
- Urgency badge for `{is_urgent}` and deadline indicator if linked to an event.  
**Player Experience Summary:** Player absorbs intel, chooses dialogue outcomes, and sees immediate stat shifts.  
**System Notes:**  
- Dialogue choices must apply at least one metric delta and one relationship delta for relationship-tracked actors; briefings may omit relationship deltas and be informational.  
- Dialogue choices can set flags used by events (e.g., corruption or insurgent splinter).  
- Intel feed updates `is_read` and appends to `{status_report}`.

## Phase 7: Decision Cycle - Action Planning & Commit
**Trigger:** Player selects an action from action bar or action catalog.  
**Conditional Variations:**  
- If `{personnel} == 0`, block security/humanitarian actions.  
- If `{budget} == 0`, allow non-budget actions at reduced effectiveness.  
- If `{intel_points} == 0`, apply accuracy penalty to action outcomes.  
- If `{political_capital} < 20`, limit diplomacy actions to low-impact options.  
- If action cooldown active (`{cooldown_turns}`), disable action option.  
**UI Elements:**  
- Action modal with selected target (zone/territory/actor).  
- Action Catalog modal with tabs: Security, Diplomacy, Humanitarian, Governance/Economic, Climate, Intelligence, Community Mediation.  
- Range sliders for `{budget}`, `{political_capital}`, and `{personnel}` allocation; each slider max equals remaining resource totals; real-time "Operation Cost" summary.  
- "Commit Action" button; hover state glow; disabled state with reason tooltip. <!-- Missing reference -->  
**Player Experience Summary:** Player configures up to 3 actions, balancing resource costs against expected metric shifts.  
**System Notes:**  
- Validate action: costs, cooldowns, intel gate, target eligibility.  
- `action.intel_gate` is evaluated against `{resources.intel_points}`. `{ai_state.intel_confidence}` remains a forecast/confidence signal and does not unlock actions.
- `requirements.condition` and `corruption_risk.condition` use the restricted action-condition DSL; unsupported authored expressions fail content load rather than silently evaluating at runtime.
- Default `cooldown_turns = 1` per action (from `game_config.default_action_cooldown_turns`).  
- Default `intel_gate = 10` per action (from `game_config.default_intel_gate`).  
- Targeting effects: zone actions apply full effect; territory actions apply 50% effect across 2-3 zones in the territory.  
- Governance/Economic actions resolve after 2 turns (queued effects shown in Status Report).  
- When rendering UI labels, map `Governance/Economic` → `governance_economic` and `Community Mediation` → `community_mediation` so analytics/category-spam logic receives canonical keys even though the user-facing labels include spaces and slashes.  
- On commit: deduct allocated `{costs.*}` (as configured by sliders), apply immediate `{effects}`, append to `{actions_log}`.  
- On commit: resolve `effects.risks` deterministically. A fired civilian-harm risk applies its metric deltas, appends `civilian_harm_incident`, records `risk_outcomes`, and feeds the media civilian-harm event path.
- Update `{actions_remaining}` and lock action slots when 0.

## Phase 8: Crisis Response & End-Turn Resolution
**Trigger:** Player clicks "End Turn".  
**Conditional Variations:**  
- If any active event `{deadline_turn}` missed, apply penalty bundle and possibly trigger failure.  
- If `{stability} <= 24` OR `{insurgency} >= 75` OR `{civilian_support} <= 24` OR `{global_legitimacy} <= 24` OR `{regional_synergy} <= 24` for 3 consecutive turns, trigger early defeat.  
**UI Elements:**  
- Resolution overlay summarizing actions, costs, metric deltas, and events.  
- Notifications for new crises (e.g., "Inter-Communal Violence") with deadlines.  
- Status report panel entry appended in "Status Report."  
**Player Experience Summary:** Player sees outcomes, AI reactions, and updated crisis landscape.  
**System Notes:**  
- Apply AI Director rules: category spam, low stability, low legitimacy, low support trigger escalations.  
- Resolve events, apply per-turn drift formula, clamp metrics to 0-100.  
- Update `{opposition_pressure}`, `{intel_confidence}`, `{zone_state}`, `{territory_state}`.  
- Decrement `{time_months}` by turn duration + action costs; if `<= 0` pre-turn 20, immediate failure.

## Phase 9: Act Transitions & Cutscenes
**Trigger:** End of turns 4, 8, 12, 16; Act 5 accelerated clock begins at turn 17.  
**Conditional Variations:**  
- If narrative arcs triggered, show corresponding cutscene or event chain.  
**UI Elements:**  
- Cutscene overlay with localized text `{cutscene_id}` and media `{media_url}`.  
- Act summary card (dominant action categories, relationship shifts).  
- Optional leaderboard overlay (glassmorphic) with `{strategic_score}`.  
**Player Experience Summary:** Player transitions between acts, sees narrative stakes evolve, and reorients strategy.  
**System Notes:**  
- Trigger Act briefings at turns 1, 5, 9, 13, 17 (AU leadership voice).  
- Evaluate arc triggers per `FULL_GAME_NARRATIVE_DESIGN.md`: climate shock, youth unrest, corruption exposure, Wagner expansion, AES consolidation, border fracture, humanitarian corridor, insurgent splinter, governance crisis.  
- Trigger by `{turn}` values mapped to act beats; evaluate arc triggers (e.g., climate shock if `< 2` climate actions by end of Act 2).  
- Log per-act telemetry.

## Phase 10: Final Phase - Endgame Outcomes & Metrics
**Trigger:** `{turn == 20}` and resolution complete; or early fail condition triggered.  
**Conditional Variations:**  
- Success if all thresholds met: `{stability >= 55}`, `{insurgency <= 45}`, `{civilian_support >= 50}`, `{global_legitimacy >= 55}`, `{regional_synergy >= 55}`.  
- Failure if any early fail condition, missed failure_on_deadline deadline, or `{time_months <= 0}` before Turn 20.  
**UI Elements:**  
- Results dashboard: final metrics bars, zone status map, and outcome banner.  
- AU report summary with narrative tone (Strategic Success / Fragile Success / Stalemate / Regional Setback / Mandate Revoked).  
- "View Full Log" (actions, events, actor relationships).  
- Leaderboard overlay (glassmorphic), if enabled.  
**Player Experience Summary:** Player receives the final AU mandate outcome, performance metrics, and an authoritative campaign report.  
**System Notes:**  
- Determine ending type based on thresholds and critical state in final turns:  
  - Strategic Success: all thresholds met, no Critical metrics in final 2 turns.  
  - Fragile Success: thresholds met, at least one metric in High range (50-74) in final turn.  
  - Stalemate: 1-2 thresholds missed.  
  - Regional Setback: more than 2 thresholds missed OR Critical zone persists (turns 19-20).  
  - Mandate Revoked: early fail condition triggered (including a 3-turn streak completing on Turn 20).  
- Record per-campaign telemetry `{ending_type}`, `{final_metrics}`, `{most_used_actions}`, `{most_impacted_zones}`.  
- Strategic score: `strategic_score = round((stability + global_legitimacy) / 2)`.  
- Leaderboard overlay only if telemetry opt-in is true.

## Design Alignment Notes
- Flow aligns to canonical structure: 5 acts x 4 turns, 3 actions per turn, 48-month clock, per-turn drift and AI director rules.  
- Narrative beats (corruption, tribalism, climate shock, coalition building) surface via event triggers tied to `{metrics.*}` and `{flags}`.  
- UI matches tactical situation room spec (fixed-fluid-fixed layout, glassmorphic panels, gold accents, intel feed, actor sentiments).  
- Missing details flagged for CTA labels, session resume flow, cooldown UI states, and action cost schema updates.
