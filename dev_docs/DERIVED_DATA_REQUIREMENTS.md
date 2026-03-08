# Derived Data Requirements (Full Game)

Purpose
- Computed values used for UI, AI, and evaluation.
- Can be stored or computed on demand.

Threat Scores
- Zone threat score:
  - zoneThreat = 0.6 * insurgency + 0.4 * (100 - stability)
- Territory threat score (Tthreat):
  - weight = zone population if numeric, else 1
  - Tthreat = sum(weight * zoneThreat) / sum(weight)
  - If territory has no zones: fallback = 0.6 * insurgency + 0.4 * (100 - stability)

Threat Levels
- Low: 0-24
- Moderate: 25-49
- High: 50-74
- Critical: 75-100

Per-Turn Drift (After Actions and Events)
- baseDelta = (50 - Tthreat) / 20
- stability += baseDelta
- insurgency -= baseDelta
- criticalCount = number of zones with zoneThreat >= 75
- stability -= min(criticalCount * 0.5, 2)
- insurgency += min(criticalCount * 0.5, 2)
- Clamp stability and insurgency to 0-100

Relationship Labels (Derived)
- 0-20 Hostile
- 21-40 Adversarial
- 41-60 Neutral
- 61-80 Cooperative
- 81-100 Allied

Win/Lose Evaluation (End of Turn 20)
- Check all five win thresholds
- If any fail condition triggered earlier, ending is forced
- Immediate loss if time_months <= 0 before turn 20

