# Trigger DSL Specification v1.0

## Purpose
Defines the formal grammar for event trigger conditions in African Mandate. All `trigger_conditions` strings in events.json must conform to this specification.

## Grammar (EBNF)

```ebnf
trigger_condition  ::= expression

expression         ::= or_expr
or_expr            ::= and_expr ( "OR" and_expr )*
and_expr           ::= primary ( "AND" primary )*

primary            ::= comparison
                     | membership
                     | streak_condition
                     | history_condition
                     | flag_check
                     | "(" expression ")"

comparison         ::= operand comparator operand
membership         ::= operand "in" list_literal
streak_condition   ::= comparison "for" INTEGER "consecutive turns"
history_condition  ::= operand comparator operand "in last" INTEGER "turns"

operand            ::= literal | variable | function_call
variable           ::= IDENTIFIER ( "." IDENTIFIER )*
function_call      ::= IDENTIFIER "(" ( operand ( "," operand )* )? ")"

comparator         ::= "==" | "!=" | "<" | "<=" | ">" | ">="

literal            ::= INTEGER | FLOAT | STRING | BOOLEAN
list_literal       ::= "[" ( literal ( "," literal )* )? "]"

IDENTIFIER         ::= [a-z_][a-z0-9_]*
INTEGER            ::= [0-9]+
FLOAT              ::= [0-9]+ "." [0-9]+
STRING             ::= "'" [^']* "'"
BOOLEAN            ::= "true" | "false"
```

## Canonical Variable Namespaces

### Metrics (Global)
Access pattern: `{metric_name}`
- `stability` - Range 0-100
- `insurgency` - Range 0-100
- `civilian_support` - Range 0-100
- `global_legitimacy` - Range 0-100
- `regional_synergy` - Range 0-100

### Resources (Global)
Access pattern: `resources.{resource_name}` OR shorthand `{resource_name}`
- `resources.budget` / `budget`
- `resources.political_capital` / `political_capital`
- `resources.personnel` / `personnel`
- `resources.intel_points` / `intel_points`
- `resources.time_months` / `time_months`

### Turn Context
- `turn` - Current turn number (1-20)
- `act` - Derived: floor((turn - 1) / 4) + 1

### AI State
Access pattern: `ai_state.{field}`
- `ai_state.opposition_pressure`
- `ai_state.intel_confidence`

### Actor Sentiments
Access pattern (canonical): `actor_sentiments.{actor_key}.{field}`
- `actor_sentiments.regional_ecowas.relationship_score`
- `actor_sentiments.junta_burkina_traore.relationship_score`
- Valid fields: `relationship_score`, `sentiment`, `stance`, `dialogue_state`
- Optional aliases (parser-resolved): `{actor_key}_relationship`

### Zone Context (Scoped)
Access pattern: `zone.{field}` (evaluated per-zone when event has zone scope)
- `zone.stability`
- `zone.insurgency`
- `zone.civilian_support`
- `zone.threat_level`
- `zone.population`
- `zone.multi_ethnic` (boolean)

### Flags (Runtime)
Access pattern: `{flag_name}` (boolean) OR `{flag_name} == true/false`
- Any flag set by previous events or actions

### Corruption State
- `corruption_flags.{flag_id}` - Returns `active` | `resolved` | `none`
- `corruption_flags_count_act` - Count of active corruption flags in current act
- `audit_status.status` - Returns `pending` | `passed` | `failed` | `none`
- `oversight_level.level` - Returns `none` | `basic` | `strong`

### History Queries
- `{action_category}_actions_in_last_{n}_turns` - Count of actions in category
- `{metric}_history[{turn_offset}]` - Historical metric value

### Derived Counters
- `category_spam` - Boolean: any action category hits spam threshold in window
- `unresolved_crisis_count` - Active events past deadline
- `adjacent_zones_critical` - Zones with threat >= 75 adjacent to current
- `thresholds_met_all` - Boolean: all win thresholds met
- `thresholds_missed_count` - Count of win thresholds not met
- `critical_zone_persists` - Boolean: any zone still critical at evaluation
- `early_fail_triggered` - Boolean: any early fail condition triggered (critical streak, failure_on_deadline missed, or time_months <= 0 before turn 20)
- `corruption_unresolved` - Boolean: any corruption event active and unresolved
- `climate_actions_in_act2` - Count of climate actions taken in Act 2
- `idp_zones_stabilized` - Count of IDP zones stabilized this act
- `humanitarian_aid_spend_high` - Boolean: high humanitarian spend threshold met in recent window
- `security_actions_without_oversight` - Count of security actions taken while oversight_level == none in last N turns
- `civilian_harm_incidents` - Count of civilian harm incidents in last N turns
- `intel_report_age_turns` - Age of current intel report in turns
- `intel_report_generated` - Boolean: new intel report generated this turn
- `intel_report_upgrade` - Boolean: intel report upgraded this turn
- `any_junta_relationship` - Max relationship_score across junta actors
- `turns_since_phase1` - Turns since external_wagner_expansion_phase1 triggered

### Action History Counters
- `negotiation_actions_in_last_2_turns` - Count of actions tagged `negotiation` in last 2 turns
- Pattern: `{tag}_actions_in_last_{n}_turns`

### Campaign State Enums (Derived)
- `coalition_compact` - One of: 'success' | 'failure'

### RNG (Stochastic)
- `rng` - Returns float 0.0-1.0, seeded per-event per-turn

### UI Events (Telemetry Only)
Access pattern: `ui_event == '{event_name}'`
- Reserved for telemetry/UI events, not gameplay triggers

## Operator Precedence (Highest to Lowest)
1. Parentheses `()`
2. Comparison operators `==`, `!=`, `<`, `<=`, `>`, `>=`
3. `in` (membership)
4. `AND`
5. `OR`

## Evaluation Context

### Global Context Variables
Always available:
- All metrics
- All resources
- `turn`, `act`
- All flags
- `corruption_flags.*`, `audit_status`, `oversight_level`
- `ai_state.*`

### Scoped Evaluation
When `zone.*` is referenced, the trigger evaluates per-zone and fires if ANY zone matches (unless event specifies `scope: "all_zones"`).

### Temporal Conditions

#### Consecutive Turns
```
stability <= 24 for 3 consecutive turns
```
Evaluates: `metrics_history[turn-2].stability <= 24 AND metrics_history[turn-1].stability <= 24 AND metrics.stability <= 24`

#### History Window
```
security_actions_without_oversight >= 2 in last 3 turns
```
Evaluates: `count(actions_log WHERE category == 'security' AND oversight_level == 'none' AND turn >= current_turn - 3) >= 2`

## Canonical Trigger Patterns

### Pattern 1: Simple Threshold
```
stability < 45
```

### Pattern 2: Boolean Flag
```
corruption_procurement_leak_active == true
```

### Pattern 3: Turn-Based
```
turn == 7
```

### Pattern 4: Compound AND
```
political_capital < 40 AND civilian_support < 50
```

### Pattern 5: Compound OR
```
climate_shock_active == true OR zone_threat >= 75
```

### Pattern 6: Streak Detection
```
insurgency >= 75 for 3 consecutive turns
```

### Pattern 7: History Query
```
security_actions_without_oversight >= 2 in last 3 turns
```

### Pattern 8: List Membership
```
turn in [4, 8, 12, 16]
```

### Pattern 9: RNG (Probability)
```
mopti_security_ceasefire == true AND rng <= 0.60
```
Note: RNG uses deterministic seeding: `seed = hash(session_id + event_id + turn)`

### Pattern 10: Zone-Scoped
```
zone.multi_ethnic == true AND zone.civilian_support < 50 AND zone.insurgency > 60
```

### Pattern 11: Actor Relationship
```
actor_sentiments.regional_ecowas.relationship_score < 45
```
Or shorthand:
```
ecowas_relationship < 45
```

### Pattern 12: Nested Object Access
```
corruption_flags.ghost_personnel == active
```

### Pattern 13: Compound with Grouping
```
turn == 15 AND (corruption_flags_count_act >= 2 OR audit_status.status == 'failed' OR global_legitimacy < 45)
```

### Pattern 14: UI Event (Telemetry)
```
ui_event == 'landing_loaded'
```

## Event Type Classification

Events should include `event_type` to enable filtering:

| event_type | Description | UI Display |
|------------|-------------|------------|
| `crisis` | Security/humanitarian crises | Event Modal |
| `narrative` | Story beats, act transitions | Cutscene/Briefing |
| `system` | Warnings, thresholds, endgame | Alert/Toast |
| `intel` | Intelligence reports | Intel Panel |
| `ui` | Telemetry events | Not displayed |
| `tutorial` | Onboarding events | Tutorial Overlay |

## Implementation Notes

### Parser Requirements
1. Tokenize input string
2. Build AST following grammar rules
3. Evaluate AST against runtime state
4. Return boolean result

### Error Handling
- Invalid syntax: Reject event at load time
- Missing variable: Return `false` (fail-safe)
- Type mismatch: Coerce if possible, else `false`

### Performance
- Cache parsed AST per event
- Pre-compute streak histories at turn start
- Index flags as hash map for O(1) lookup

## Migration Guide

### Before (Inconsistent)
```
"stability < 45 for 2 consecutive turns"
"audit_status == failed"
"ecowas_relationship < 45 OR juntas_relationships_over_60 >= 2"
```

### After (Canonical)
```
"stability < 45 for 2 consecutive turns"
"audit_status == 'failed'"
"actor_sentiments.regional_ecowas.relationship_score < 45 OR junta_allied_count >= 2"
```

Key changes:
1. String literals use single quotes
2. Actor relationships use canonical path
3. Derived counters use explicit names

## Validation Checklist

- [ ] All variables resolve to defined namespaces
- [ ] Comparators match operand types
- [ ] Streak conditions use integer turn counts
- [ ] RNG conditions are seeded deterministically
- [ ] Zone-scoped conditions define scope behavior
- [ ] UI events are marked with `event_type: "ui"`
