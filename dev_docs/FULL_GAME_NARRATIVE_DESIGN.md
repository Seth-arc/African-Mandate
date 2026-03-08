# African Mandate - Full Game Narrative Design (MDA)

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
- Zone threat score: 0.6 * insurgency + 0.4 * (100 - stability)
  - Low 0-24, Moderate 25-49, High 50-74, Critical 75-100
- Map structure: territories (countries) composed of multiple zones
  - Actions and events can target either a territory or specific zones within it
- Territory aggregation and per-turn drift:
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
- Actor relationship bands:
  - 0-20 Hostile, 21-40 Adversarial, 41-60 Neutral, 61-80 Cooperative, 81-100 Allied
- Text encoding: UTF-8 across all narrative and UI content

## MDA Mapping (Narrative)
- Mechanics:
  - Act and turn structure
  - Event triggers and deadlines
  - Dialogue trees with effects
  - Relationship states and thresholds
  - Win/lose thresholds and endings
- Dynamics:
  - Escalation of crises across acts
  - Actor alliances and backlash
  - Consequence cascades from early choices
  - Narrative pressure curve and moral tradeoffs
- Aesthetics:
  - Urgency, responsibility, and moral ambiguity
  - African-led global_legitimacy and ownership
  - Earned progress under scarcity

## Narrative Pillars
- African agency and ownership over external dependency
- Civilian protection over purely kinetic outcomes
- Systems thinking across security, climate, governance, economy
- Moral complexity with no perfect solutions
- Integrity and anti-corruption as strategic global_legitimacy
- Tribalism and communal fractures as conflict multipliers

## Act Structure (Full Campaign)
- Act 1: Emergency Response
  - Theme: Stabilize immediate threats and prove credibility
  - Core feeling: Overwhelmed but decisive
- Act 2: Coalition Building
  - Theme: Unite actors, define a regional framework
  - Core feeling: Hope tempered by political fragility
- Act 3: Adaptation and Escalation
  - Theme: Adversaries adapt, climate shocks intensify
  - Core feeling: Moral testing and high volatility
- Act 4: The Long Game
  - Theme: Institutionalize gains and prevent backsliding
  - Core feeling: Strategic reflection and long-term tradeoffs
- Act 5: The Reckoning
  - Theme: Compressed timeline, final accountability
  - Core feeling: Urgent closure and legacy

## Corruption Thread (Cross-Act Narrative Angle)
Purpose: Treat corruption as a systemic adversary that erodes global_legitimacy, distorts outcomes, and fuels insurgent recruitment. The player must actively confront it, not just absorb its costs.

Core corruption behaviors to surface:
- Diversion of humanitarian aid and security budgets
- Patronage networks that block reforms
- Predatory security force practices that generate grievances
- Procurement fraud and ghost personnel

Act beats:
- Act 1: Early signs of aid diversion and inflated reports; dilemma between speed and oversight
- Act 2: Coalition partners demand exemptions; corruption becomes a bargaining chip
- Act 3: Scandals erupt; whistleblowers emerge; global_legitimacy under stress
- Act 4: Institutional reform vs regime survival; integrity measures provoke backlash
- Act 5: Final accountability or negotiated amnesty shapes ending tone

Corruption triggers and consequences:
- If political_capital < 40 and civilian_support < 50: `procurement_leak` event exposes procurement fraud; global_legitimacy hit and donor pause
- If repeated security actions without oversight: civilian abuse reports trigger unrest and insurgent recruitment narrative
- If aid corridors funded without monitoring: `ghost_aid` event reduces humanitarian impact and increases insurgency
- Corruption exposure and donor conditionality trigger penalties/arc events only; they do not directly cause mandate_revoked

Mitigation choices (narrative):
- Independent audit commission (short-term friction, long-term global_legitimacy gain)
- Whistleblower protection (boosts civilian_support, risks political retaliation)
- Conditional aid with transparency clauses (budget delayed but efficiency improves)
- Community oversight councils (slow rollout, strong trust gains)

Ending influence:
- High integrity path: ending emphasizes institution-building and durable peace
- Compromised path: ending notes stability achieved but global_legitimacy remains fragile

## Tribalism Thread (Cross-Act Narrative Angle)
Purpose: Portray tribal and communal fractures as drivers of instability that insurgents and elites exploit, while centering local reconciliation as a core strategic objective.

Core tribal/communal dynamics to surface:
- Historical grievances and land/resource disputes
- Politicized identity mobilization by local elites
- Cycles of retaliatory violence between communities
- Distrust of state security forces perceived as partisan

Act beats:
- Act 1: Local clashes erupt around a crisis zone; player must choose rapid security response vs mediated dialogue
- Act 2: Coalition partners push for hardline measures; community leaders demand recognition and autonomy guarantees
- Act 3: Insurgents exploit grievances to recruit; inter-communal violence spikes if unresolved
- Act 4: Reconciliation frameworks vs short-term security wins; risk of peace agreements collapsing
- Act 5: Endgame global_legitimacy tied to whether communal trust was rebuilt

Tribalism triggers and consequences:
- If civilian_support < 50 and insurgency > 60 in a multi-ethnic zone: inter-communal violence event triggers
- If repeated security actions occur without civilian safeguards: perceived bias increases, civilian_support drops
- If mediation actions are taken and sustained: local trust increases and insurgent recruitment weakens

Mitigation choices (narrative):
- Local peace councils with equal representation
- Joint patrols with community oversight
- Land/resource dispute arbitration commissions
- Cultural liaison teams embedded with operations

Ending influence:
- Reconciliation path: ending emphasizes social cohesion and durable stability
- Fragmented path: ending notes that security gains are brittle without social repair

## Critical Path Spines (Linear Variants)
1) Security-First Spine
- Act 1: Prioritize highest-threat zones and visible stabilization
- Act 2: Formalize security pact with ECOWAS and select juntas
- Act 3: Insurgent counter-adaptation forces restraint
- Act 4: Shift to governance and economic normalization
- Act 5: Consolidate, manage global_legitimacy risk, meet thresholds

2) Diplomacy-First Spine
- Act 1: Early negotiation and intel investment
- Act 2: Formal AU-ECOWAS coordination and de-escalation
- Act 3: Exploit insurgent splits via dialogue
- Act 4: Institutional reforms and local ownership
- Act 5: Stabilize with high global_legitimacy and civilian_support

3) Humanitarian-First Spine
- Act 1: Aid corridors and IDP stabilization first
- Act 2: Donor leverage and humanitarian coalition
- Act 3: Security deterioration forces hard tradeoffs
- Act 4: Integrated stabilization programs
- Act 5: Recovery and global_legitimacy surge if security contained

## Nonlinear Arcs (Triggered Branches)
- Wagner Expansion Arc
  - Trigger: global_legitimacy < 50 AND at least one junta relation > 60
  - Effect: External actor pressure, resource tradeoffs
- AES Consolidation Arc
  - Trigger: ECOWAS relation < 45 OR multiple juntas > 60
  - Effect: Diplomatic field shifts, insurgency pressure rises
- Climate Shock Arc
  - Trigger: Fewer than 2 climate actions by end of Act 2
  - Effect: Displacement and resource drain in Act 3-4
- Youth Unrest Arc
  - Trigger: civilian_support < 45 for 2 consecutive turns
  - Effect: Unrest events and global_legitimacy penalties
- Border Fracture Arc
  - Trigger: Two adjacent zones Critical for 2 turns
  - Effect: Smuggling and insurgent financing increase
- Humanitarian Corridor Arc
  - Trigger: Two IDP zones stabilized
  - Effect: Donor funding and global_legitimacy bonuses
- Insurgent Splinter Arc
  - Trigger: Negotiation choices made AND insurgency < 50
  - Effect: Alternative peace outcomes with splinter risks
- Governance Crisis Arc
  - Trigger: political_capital < 35 AND corruption events unresolved
  - Effect: global_legitimacy collapse risk
- Corruption Exposure Arc
  - Trigger: Two corruption flags within one act OR donor audit failure
  - Effect: International scrutiny, budget freeze threat, actor relations shift

## Event Trigger Map (By Turn)
- Turn 1: Act 1 opening crisis triage
- Turn 2: First consequences of ignored crisis (zone threat +1 level)
- Turn 3: global_legitimacy check (if < 50, international pressure event)
- Turn 4: Act 1 climax tradeoff
- Turn 5: Act 2 opening coalition summit
- Turn 8: Act 2 climax (compact formed or fails)
- Turn 9: Act 3 opening adaptive insurgency report
- Turn 12: Act 3 climate shock if mitigation < 2 actions
- Turn 12: Act 3 climax compounding crisis
- Turn 13: Act 4 opening strategic direction choice
- Turn 16: Act 4 consolidation test
- Turn 17: Act 5 accelerated clock begins
- Turn 20: Final evaluation and ending

## Corruption-Focused Event Templates (Sample)
- Ghost Payroll (Any Act): personnel inflated; action effectiveness reduced until investigated
- Procurement Leak (Act 2-3): media exposes contract fraud; global_legitimacy drops unless addressed
- Security Force Abuses (Act 3): civilian_support drops; insurgency rises; requires accountability response
- Donor Conditionality (Act 4): donor funds withheld until transparency reforms enacted

## Dialogue System Canon
- 4 options per dialogue node
- Each choice affects at least one metric and one relationship
  - Exception: briefings or dialogues with non-relationship actors may omit relationship deltas and be informational; use resource deltas and/or narrative flags where applicable
- Dialogue options can be gated by:
  - Actor relationship bands
  - intel_points threshold
  - political_capital threshold
- Dialogue effects can set flags that unlock or lock narrative events
  - Corruption flags specifically gate donor behavior and global_legitimacy recovery arcs

## Endings (Full Game)
- Strategic Success: all thresholds met, no Critical metrics in final 2 turns
- Fragile Success: thresholds met, at least one metric in High range (50-74) among positive metrics
- Stalemate: 1-2 thresholds missed, mixed outcome narrative
- Regional Setback: more than 2 thresholds missed or Critical zone persists (any zone Critical in both turns 19 and 20)
- Mandate Revoked: early fail condition triggered (including a 3-turn streak completing on Turn 20)

## Narrative Data Requirements (Non-Negotiable)
- Events must include: trigger conditions, deadlines, narrative text, metric deltas, actor reactions
- Dialogue nodes must include: stance gate, relationship delta, metric delta, follow-up flags (for relationship-tracked actors; briefings may omit relationship deltas and be informational)
- Cutscenes must include: act, trigger turn, localized text keys, media references
- All narrative text stored in UTF-8 and localization-ready keys
