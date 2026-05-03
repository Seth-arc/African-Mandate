/**
 * Action resolution: validate, pay costs, apply effects.
 * Pure functions; throw GameError on invalid input.
 * Aligned with FULL_GAME_SYSTEM_DESIGN action resolution pipeline (steps 1–3).
 */

import type {
  GameState,
  ActionDefinition,
  ActionTarget,
  Resources,
  Metrics,
  ZoneState,
  ActorSentiment,
  AiState,
  ActionLogEntry,
  ActionRiskOutcome,
} from '../state/types'
import { GameError } from '../state/types'
import { reconcileTerritoryStateFromZones } from '../state/territoryStateRuntime'
import { upsertIntelFeedByGenerator } from './intelResolver'
import { evaluateActionCondition } from './actionConditionEvaluator'

const METRIC_KEYS = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
] as const

const RESOURCE_KEYS = [
  'budget',
  'political_capital',
  'personnel',
  'intel_points',
  'time_months',
] as const

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampResource(value: number): number {
  return Math.max(0, Math.round(value))
}

function clampAiStateValue(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function targetSeed(target: ActionTarget): string {
  return target.zone_id ?? target.territory_key ?? target.actor_key ?? 'no_target'
}

function hashToUnitInterval(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0x100000000
}

/**
 * Resolve cost for an action. Uses allocation when provided (capped by min/max);
 * otherwise uses each cost's default. Returns a Resources object.
 */
export function getResolvedCost(
  action: ActionDefinition,
  allocation?: Partial<Resources>
): Resources {
  const cost: Resources = {
    budget: 0,
    political_capital: 0,
    personnel: 0,
    intel_points: 0,
    time_months: 0,
  }
  for (const key of RESOURCE_KEYS) {
    const range = action.costs[key]
    if (!range) continue
    const requested = allocation?.[key] ?? range.default
    let value: number
    if (range.step > 0) {
      const steps = Math.round((Math.max(range.min, Math.min(range.max, requested)) - range.min) / range.step)
      value = range.min + steps * range.step
      value = Math.max(range.min, Math.min(range.max, value))
    } else {
      value = Math.max(range.min, Math.min(range.max, requested))
    }
    cost[key] = value
  }
  return cost
}

/**
 * Validate that the action can be executed: actions_remaining, cooldown,
 * intel gate, resources cover cost, target eligibility, requirements.
 * Throws GameError on any failure.
 */
export function validateAction(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget,
  cost: Resources
): void {
  const { session, config } = state

  if (session.actions_remaining <= 0) {
    throw new GameError('No actions remaining this turn', 'NO_ACTIONS_REMAINING')
  }

  const cooldown = action.cooldown_turns ?? config.default_action_cooldown_turns ?? 1
  const lastUsed = session.action_last_used_turn?.[action.action_id]
  if (lastUsed !== undefined && session.turn - lastUsed < cooldown) {
    throw new GameError(
      `Action ${action.action_id} on cooldown until turn ${lastUsed + cooldown}`,
      'ACTION_COOLDOWN'
    )
  }

  const intelGate = action.intel_gate ?? config.default_intel_gate ?? 0
  if (session.resources.intel_points < intelGate) {
    throw new GameError(
      `Action requires intel_points >= ${intelGate}, current ${session.resources.intel_points}`,
      'INTEL_GATE'
    )
  }

  if (session.resources.budget < cost.budget) {
    throw new GameError(`Insufficient budget: need ${cost.budget}, have ${session.resources.budget}`, 'INSUFFICIENT_BUDGET')
  }
  if (session.resources.political_capital < cost.political_capital) {
    throw new GameError(
      `Insufficient political_capital: need ${cost.political_capital}, have ${session.resources.political_capital}`,
      'INSUFFICIENT_POLITICAL_CAPITAL'
    )
  }
  if (session.resources.personnel < cost.personnel) {
    throw new GameError(`Insufficient personnel: need ${cost.personnel}, have ${session.resources.personnel}`, 'INSUFFICIENT_PERSONNEL')
  }
  if (session.resources.intel_points < cost.intel_points) {
    throw new GameError(
      `Insufficient intel_points: need ${cost.intel_points}, have ${session.resources.intel_points}`,
      'INSUFFICIENT_INTEL_POINTS'
    )
  }
  if (session.resources.time_months < cost.time_months) {
    throw new GameError(
      `Insufficient time_months: need ${cost.time_months}, have ${session.resources.time_months}`,
      'INSUFFICIENT_TIME_MONTHS'
    )
  }

  const req = action.requirements ?? {}
  if (req.min_personnel !== undefined && session.resources.personnel < req.min_personnel) {
    throw new GameError(`Requires at least ${req.min_personnel} personnel`, 'REQUIREMENT_MIN_PERSONNEL')
  }
  if (req.min_intel_points !== undefined && session.resources.intel_points < req.min_intel_points) {
    throw new GameError(`Requires at least ${req.min_intel_points} intel_points`, 'REQUIREMENT_MIN_INTEL_POINTS')
  }
  if (req.min_political_capital !== undefined && session.resources.political_capital < req.min_political_capital) {
    throw new GameError(`Requires at least ${req.min_political_capital} political_capital`, 'REQUIREMENT_MIN_POLITICAL_CAPITAL')
  }
  if (req.min_budget !== undefined && session.resources.budget < req.min_budget) {
    throw new GameError(`Requires at least ${req.min_budget} budget`, 'REQUIREMENT_MIN_BUDGET')
  }
  const flagsRequired = req.flags_required ?? []
  const narrativeFlags = state.narrative_flags ?? {}
  for (const flag of flagsRequired) {
    if (!narrativeFlags[flag]) {
      throw new GameError(`Required flag not set: ${flag}`, 'REQUIREMENT_FLAGS_REQUIRED')
    }
  }
  if (req.condition && !evaluateActionCondition(state, req.condition)) {
    throw new GameError(`Requirement condition not met: ${req.condition}`, 'REQUIREMENT_CONDITION')
  }

  switch (action.target_scope) {
    case 'zone':
      if (target.zone_id === undefined || target.zone_id === '') {
        throw new GameError('Zone action requires target.zone_id', 'INVALID_TARGET')
      }
      if (state.zone_state && state.zone_state[target.zone_id] === undefined) {
        throw new GameError(`Unknown zone: ${target.zone_id}`, 'INVALID_TARGET')
      }
      break
    case 'territory':
      if (target.territory_key === undefined) {
        throw new GameError('Territory action requires target.territory_key', 'INVALID_TARGET')
      }
      if (state.territory_state && state.territory_state[target.territory_key] === undefined) {
        throw new GameError(`Unknown territory: ${target.territory_key}`, 'INVALID_TARGET')
      }
      break
    case 'actor':
      if (target.actor_key === undefined || target.actor_key === '') {
        throw new GameError('Actor action requires target.actor_key', 'INVALID_TARGET')
      }
      {
        const allowed = action.target_actors ?? []
        if (allowed.length > 0 && !allowed.includes(target.actor_key)) {
          throw new GameError(
            `Actor ${target.actor_key} is not a valid target for this action; allowed: ${allowed.join(', ')}`,
            'INVALID_TARGET'
          )
        }
      }
      break
    default:
      throw new GameError(`Unknown target_scope: ${(action as ActionDefinition).target_scope}`, 'INVALID_TARGET')
  }
}

/**
 * Subtract cost from session resources. Returns new Resources (immutable).
 */
function payCosts(current: Resources, cost: Resources): Resources {
  return {
    budget: clampResource(current.budget - cost.budget),
    political_capital: clampResource(current.political_capital - cost.political_capital),
    personnel: clampResource(current.personnel - cost.personnel),
    intel_points: clampResource(current.intel_points - cost.intel_points),
    time_months: clampResource(current.time_months - cost.time_months),
  }
}

/**
 * Apply action effects to metrics (global). Returns new Metrics, clamped 0–100.
 */
function applyMetricsEffects(current: Metrics, effects: Partial<Metrics> | undefined): Metrics {
  if (!effects) return { ...current }
  const next = { ...current }
  for (const key of METRIC_KEYS) {
    const delta = effects[key]
    if (delta !== undefined) {
      next[key] = clampMetric(current[key] + delta)
    }
  }
  return next
}

function applyResourceEffects(current: Resources, effects: Partial<Resources> | undefined): Resources {
  if (!effects) return { ...current }
  const next = { ...current }
  for (const key of RESOURCE_KEYS) {
    const delta = effects[key]
    if (delta !== undefined) {
      next[key] = clampResource(current[key] + delta)
    }
  }
  return next
}

function applyAiStateEffects(current: AiState, effects: Partial<AiState> | undefined): AiState {
  if (!effects) return { ...current }
  return {
    opposition_pressure:
      effects.opposition_pressure !== undefined
        ? clampAiStateValue(current.opposition_pressure + effects.opposition_pressure)
        : current.opposition_pressure,
    intel_confidence:
      effects.intel_confidence !== undefined
        ? clampAiStateValue(current.intel_confidence + effects.intel_confidence)
        : current.intel_confidence,
  }
}

function applyRiskMetrics(current: Metrics, outcomes: ActionRiskOutcome[]): Metrics {
  let next = { ...current }
  for (const outcome of outcomes) {
    if (!outcome.applied) continue
    next = applyMetricsEffects(next, outcome.metric_deltas)
  }
  return next
}

function resolveCivilianHarmRisk(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget
): ActionRiskOutcome[] {
  const risk = action.effects.risks
  const threshold = risk?.civilian_harm_chance
  if (threshold === undefined) return []

  const boundedThreshold = Math.max(0, Math.min(1, threshold))
  const seed = [
    state.session.turn,
    action.action_id,
    targetSeed(target),
    state.session.actions_remaining,
  ].join(':')
  const roll = hashToUnitInterval(seed)
  const applied = roll < boundedThreshold
  const metricDeltas = applied && risk?.civilian_harm_effects ? { ...risk.civilian_harm_effects } : {}
  const flagAdditions = applied ? ['civilian_harm_incident'] : []

  return [
    {
      type: 'civilian_harm',
      applied,
      roll: Number(roll.toFixed(6)),
      threshold: boundedThreshold,
      metric_deltas: metricDeltas,
      flag_additions: flagAdditions,
      media_event_key: applied ? 'media_civilian_harm_report' : null,
    },
  ]
}

function resolveCorruptionRiskFlags(state: GameState, action: ActionDefinition): string[] {
  const risk = action.corruption_risk
  if (!risk) return []
  if (!evaluateActionCondition(state, risk.condition)) return []
  return [risk.flag]
}

function applyFlagAdditions(
  state: GameState,
  flags: string[],
  turn: number
): GameState {
  if (flags.length === 0) return state

  const narrativeFlags = { ...(state.narrative_flags ?? {}) }
  const narrativeFlagTurns = { ...(state.narrative_flag_turns ?? {}) }
  for (const flag of flags) {
    narrativeFlags[flag] = true
    if (narrativeFlagTurns[flag] === undefined) {
      narrativeFlagTurns[flag] = turn
    }
  }
  return {
    ...state,
    narrative_flags: narrativeFlags,
    narrative_flag_turns: narrativeFlagTurns,
  }
}

function resolveActionOutcomeMetadata(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget
): { riskOutcomes: ActionRiskOutcome[]; flagAdditions: string[] } {
  const riskOutcomes = resolveCivilianHarmRisk(state, action, target)
  const riskFlags = riskOutcomes.flatMap((outcome) => outcome.flag_additions)
  const corruptionFlags = resolveCorruptionRiskFlags(state, action)
  return {
    riskOutcomes,
    flagAdditions: [
      ...(action.effects.flags ?? []),
      ...corruptionFlags,
      ...riskFlags,
    ],
  }
}

/**
 * Apply zone_effects to a single zone. Returns new ZoneState.
 */
function applyZoneEffects(zone: ZoneState, zoneEffects: Record<string, number> | undefined): ZoneState {
  if (!zoneEffects) return { ...zone }
  const next = { ...zone }
  if (zoneEffects.threat_level !== undefined) {
    next.threat_level = Math.max(0, Math.min(100, zone.threat_level + zoneEffects.threat_level))
  }
  if (zoneEffects.stability !== undefined) {
    next.stability = clampMetric(zone.stability + zoneEffects.stability)
  }
  if (zoneEffects.insurgency !== undefined) {
    next.insurgency = clampMetric(zone.insurgency + zoneEffects.insurgency)
  }
  if (zoneEffects.civilian_support !== undefined) {
    next.civilian_support = clampMetric(zone.civilian_support + zoneEffects.civilian_support)
  }
  if (zoneEffects.displaced !== undefined) {
    next.displaced = Math.max(0, zone.displaced + zoneEffects.displaced)
  }
  return next
}

/**
 * Derive relationship label from score (0–100). REQUIRED_KEYS bands.
 */
function relationshipLabelFromScore(score: number): ActorSentiment['relationship_label'] {
  if (score <= 20) return 'hostile'
  if (score <= 40) return 'adversarial'
  if (score <= 60) return 'neutral'
  if (score <= 80) return 'cooperative'
  return 'allied'
}

/**
 * Apply actor_effects to one actor sentiment. Returns new ActorSentiment.
 */
function applyActorEffects(
  current: ActorSentiment,
  actorEffects: { relationship_score?: number } | undefined
): ActorSentiment {
  if (!actorEffects?.relationship_score) return { ...current }
  const newScore = Math.max(0, Math.min(100, current.relationship_score + actorEffects.relationship_score))
  return {
    ...current,
    relationship_score: newScore,
    relationship_label: relationshipLabelFromScore(newScore),
  }
}

/**
 * Apply all effects of an action: global metrics, zone (if target_scope zone),
 * actor (if target_scope actor), and narrative flags. Returns new state (immutable).
 */
export function applyEffects(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget
): GameState {
  const { effects } = action
  let nextState: GameState = { ...state }
  const outcomeMetadata = resolveActionOutcomeMetadata(state, action, target)

  nextState = {
    ...nextState,
    session: {
      ...nextState.session,
      metrics: applyRiskMetrics(applyMetricsEffects(nextState.session.metrics, effects.metrics), outcomeMetadata.riskOutcomes),
      resources: applyResourceEffects(nextState.session.resources, effects.resources),
      ai_state: applyAiStateEffects(nextState.session.ai_state, effects.ai_state),
    },
  }

  nextState = applyFlagAdditions(nextState, outcomeMetadata.flagAdditions, state.session.turn)

  if (effects.sets_oversight_level) {
    nextState = {
      ...nextState,
      oversight_level: {
        level: effects.sets_oversight_level,
        set_on_turn: state.session.turn,
      },
    }
  }

  if (effects.sets_audit_status) {
    nextState = {
      ...nextState,
      audit_status: {
        status: effects.sets_audit_status,
        set_on_turn: state.session.turn,
      },
    }
  }

  const targetZone = target.zone_id !== undefined ? state.zone_state?.[target.zone_id] : undefined
  if (effects.zone_effects && target.zone_id && targetZone !== undefined) {
    const updated = applyZoneEffects(targetZone, effects.zone_effects)
    nextState = {
      ...nextState,
      zone_state: { ...(nextState.zone_state ?? {}), [target.zone_id]: updated },
    }
  }

  const targetActor = target.actor_key !== undefined ? state.actor_sentiments?.[target.actor_key] : undefined
  if (effects.actor_effects && target.actor_key && targetActor !== undefined) {
    const updated = applyActorEffects(targetActor, effects.actor_effects)
    nextState = {
      ...nextState,
      actor_sentiments: { ...(nextState.actor_sentiments ?? {}), [target.actor_key]: updated },
    }
  }

  const intelUpdate = upsertIntelFeedByGenerator(nextState, action.action_id, state.session.turn)
  nextState = intelUpdate.state
  if (intelUpdate.generated || intelUpdate.upgraded) {
    const narrativeFlags = { ...(nextState.narrative_flags ?? {}), intel_report_generated: true }
    const narrativeFlagTurns = { ...(nextState.narrative_flag_turns ?? {}) }
    if (narrativeFlagTurns.intel_report_generated === undefined) {
      narrativeFlagTurns.intel_report_generated = state.session.turn
    }
    nextState = {
      ...nextState,
      narrative_flags: narrativeFlags,
      narrative_flag_turns: narrativeFlagTurns,
    }
  }

  return reconcileTerritoryStateFromZones(nextState)
}

function deriveMetricDeltas(before: Metrics, after: Metrics): Partial<Metrics> {
  const out: Partial<Metrics> = {}
  for (const key of METRIC_KEYS) {
    const delta = after[key] - before[key]
    if (delta !== 0) {
      out[key] = delta
    }
  }
  return out
}

function deriveResourceDeltas(before: Resources, after: Resources): Partial<Resources> {
  const out: Partial<Resources> = {}
  for (const key of RESOURCE_KEYS) {
    const delta = after[key] - before[key]
    if (delta !== 0) {
      out[key] = delta
    }
  }
  return out
}

/**
 * Execute one action: validate, pay costs, apply effects, decrement actions_remaining,
 * record action_last_used_turn. Returns new GameState (immutable).
 * Optional allocation overrides default costs; otherwise action cost defaults are used.
 */
export function applyAction(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget,
  allocation?: Partial<Resources>
): GameState {
  const cost = getResolvedCost(action, allocation)
  validateAction(state, action, target, cost)

  let nextState: GameState = {
    ...state,
    session: {
      ...state.session,
      resources: payCosts(state.session.resources, cost),
      actions_remaining: state.session.actions_remaining - 1,
      action_last_used_turn: {
        ...(state.session.action_last_used_turn ?? {}),
        [action.action_id]: state.session.turn,
      },
    },
  }

  nextState = applyEffects(nextState, action, target)
  if (action.delay_turns !== undefined && action.delay_turns > 0 && action.delayed_effects) {
    const delayed = [...(nextState.delayed_effects ?? [])]
    delayed.push({
      turn_due: state.session.turn + action.delay_turns,
      metrics: action.delayed_effects.metrics ? { ...action.delayed_effects.metrics } : undefined,
      resources: action.delayed_effects.resources ? { ...action.delayed_effects.resources } : undefined,
      ai_state: action.delayed_effects.ai_state ? { ...action.delayed_effects.ai_state } : undefined,
    })
    nextState = { ...nextState, delayed_effects: delayed }
  }
  return nextState
}

export function executeActionWithLog(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget,
  allocation?: Partial<Resources>
): { state: GameState; logEntry: ActionLogEntry } {
  const cost = getResolvedCost(action, allocation)
  const beforeMetrics = { ...state.session.metrics }
  const beforeResources = { ...state.session.resources }
  const outcomeMetadata = resolveActionOutcomeMetadata(state, action, target)
  const afterState = applyAction(state, action, target, allocation)
  const metric_deltas = deriveMetricDeltas(beforeMetrics, afterState.session.metrics)
  const resource_deltas = deriveResourceDeltas(beforeResources, afterState.session.resources)
  const logEntry: ActionLogEntry = {
    turn: state.session.turn,
    action_id: action.action_id,
    target: { ...target },
    resolution_timing: 'immediate_action',
    costs: { ...cost },
    metric_deltas,
    resource_deltas,
    flag_additions: outcomeMetadata.flagAdditions,
    risk_outcomes: outcomeMetadata.riskOutcomes.length > 0 ? outcomeMetadata.riskOutcomes : undefined,
  }
  const nextState: GameState = {
    ...afterState,
    action_log: [...(afterState.action_log ?? []), logEntry],
  }
  return { state: nextState, logEntry }
}
