# African Mandate - Full Game Level Design (MDA)

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
- Zone threat score: 0.6 * insurgency + 0.4 * (100 - stability)
  - Low 0-24, Moderate 25-49, High 50-74, Critical 75-100

## MDA Mapping (Level Design)
- Mechanics:
  - Turn-based actions and costs
  - Zone targeting rules
  - Intel gating and cooldowns
  - Threat scoring and deadlines
- Dynamics:
  - Triage under scarcity
  - Crisis stacking from neglect
  - Risk-reward loops across metrics
- Aesthetics:
  - Pressure, responsibility, and strategic agency

## Core Loop (Per Turn)
1) Review intel feed, zones, and metrics
2) Choose 1-3 actions (target zones or actors)
3) Pay costs and apply immediate effects
4) Resolve events and AI escalation
5) End turn and log outcomes

## Rule Set (Explicit)
- Action categories: security, diplomacy, humanitarian, governance_economic, climate, intelligence, community_mediation
- Each action has:
  - Mandatory cost (budget or political_capital or personnel)
  - Optional time allocation (months)
  - 1-3 metric effects
- Intel-gated actions require intel_points >= action.intel_gate (default 10)
- Default action cooldown: 1 turn (per-action; prevents spamming)
- Zone actions affect one zone; territory actions affect 2-3 zones at reduced intensity
- All metrics clamped to 0-100; resources clamped to >= 0
- Crisis events default to 2-turn deadlines (trigger_turn + 2) unless overridden per event; missed deadlines escalate penalties

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

## Tribalism and Communal Fracture Mechanics
- Inter-communal tension is modeled through event triggers and mitigation actions
- Trigger condition (per zone): civilian_support < 50 AND insurgency > 60 in a multi-ethnic zone
- When triggered:
  - Immediate effects: civilian_support -5, stability -3, insurgency +3
  - Creates a 2-turn mediation window before escalation
- If mediation succeeds within 2 turns:
  - civilian_support +6, stability +4, insurgency -4
- If mediation fails:
  - civilian_support -8, stability -6, insurgency +6

Recommended mitigation actions (design level):
- Local peace councils (long-term civilian_support gain, slow rollout)
- Joint security patrols with community oversight (reduces bias perception)
- Land/resource arbitration commissions (lowers recurrence rate)
- Cultural liaison teams (reduces escalation severity)

## Feedback Loops
Positive loops:
1) Intel investment -> better targeting -> higher efficiency -> insurgency down -> stability up -> global_legitimacy up -> donor funding up
2) civilian_support up -> political_capital up -> successful diplomacy -> regional_synergy up -> stability up
3) Governance reforms -> lower corruption -> budget efficiency -> more action capacity -> improved outcomes

Negative loops:
1) insurgency up -> stability down -> resource drain -> fewer effective actions -> insurgency up
2) global_legitimacy down -> donor withdrawal -> budget down -> weaker humanitarian response -> civilian_support down -> global_legitimacy down
3) Overuse of kinetic actions -> civilian harm -> civilian_support down -> insurgent recruitment -> insurgency up

## Decision Model
- Triage tradeoffs: prevent next catastrophe vs stabilize current hotspot
- Uncertainty: fog of war without intel actions
- Opportunity cost: every action slot has a measurable alternative benefit
- Delayed outcomes: governance/economic actions resolve after 2 turns

## Act-Level Gameplay Focus
- Act 1: Immediate stabilization, intel building, credibility test
- Act 2: Coalition building, political_capital management, regional_synergy
- Act 3: Adaptive adversary, climate shocks, high volatility
- Act 4: Institutional investments vs security needs
- Act 5: Compressed time, final threshold push

## Success and Failure Conditions
- Success: all five win conditions met at end of Act 5
- Failure (early): stability <= 24 OR insurgency >= 75 OR civilian_support <= 24 OR global_legitimacy <= 24 OR regional_synergy <= 24 for 3 consecutive turns
- Failure (scripted): event with failure_on_deadline = true ignored past deadline
- Failure (time): time_months <= 0 before turn 20 (immediate loss)
- Failure (override): fail checks run every turn including Turn 20; if a 3-turn critical streak completes on Turn 20, Mandate Revoked overrides endgame evaluation

## Edge Cases (Explicit Handling)
- Zero budget: allow non-budget actions (diplomatic or intel) but reduce effectiveness
- Zero personnel: block security and humanitarian deployment actions
- intel_points == 0: lock intel-gated actions and reduce action accuracy
- political_capital < 20: limit diplomatic actions to low-impact options
- Action slot unused: forfeited; no carryover

## Level Data Requirements
- Each zone must define: humanizing description, threat level, insurgency, stability, population, displaced, active threats, actors present
- Each action must define: category, costs, target scope, immediate effects, delayed effects, cooldown (defaults to game_config.default_action_cooldown_turns if omitted)
- Each act must define: featured crises, key events, and act-specific modifiers
