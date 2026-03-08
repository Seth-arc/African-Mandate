/**
 * Turn engine: reset actions_remaining, resolve delayed effects, apply per-turn drift,
 * AI director rules, consume time, evaluate win/fail.
 * Pure functions; aligned with FULL_GAME_SYSTEM_DESIGN and WIN_LOSS_SCORING_SPEC.
 */

import type {
  GameState,
  Metrics,
  Resources,
  AiState,
  ZoneState,
  DelayedEffect,
  EndingType,
} from '../state/types'
import { GameError } from '../state/types'
import { resolveRuntimeEvents } from './eventResolver'

const METRIC_KEYS = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
] as const

/** Critical bands: REQUIRED_KEYS_AND_CONSTRAINTS / WIN_LOSS_SCORING_SPEC */
const CRITICAL_LOW = 24
const CRITICAL_HIGH_INSURGENCY = 75

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampResource(value: number): number {
  return Math.max(0, Math.round(value))
}

function clampAiState(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/** Derive act from turn (1-based). act = floor((turn - 1) / 4) + 1 */
export function getActFromTurn(turn: number): number {
  return Math.floor((turn - 1) / 4) + 1
}

/**
 * True when currentTurn starts a new act relative to previousTurn.
 */
export function isActTransition(previousTurn: number, currentTurn: number): boolean {
  return getActFromTurn(currentTurn) > getActFromTurn(previousTurn)
}

const FAIL_REASON_RATIONALE: Record<string, string> = {
  time_expiry: 'The mission exhausted its shared time budget before mandate completion.',
  critical_streak_stability: 'Stability remained in the critical band for three consecutive turns.',
  critical_streak_insurgency: 'Insurgency remained in the critical band for three consecutive turns.',
  critical_streak_civilian_support: 'Civilian support remained in the critical band for three consecutive turns.',
  critical_streak_global_legitimacy: 'Global legitimacy remained in the critical band for three consecutive turns.',
  critical_streak_regional_synergy: 'Regional synergy remained in the critical band for three consecutive turns.',
}

/**
 * Human-readable rationale for mandate_revoked fail_reason.
 */
export function describeFailReason(failReason: string | undefined): string {
  if (!failReason) {
    return 'No explicit fail reason was captured.'
  }
  return FAIL_REASON_RATIONALE[failReason] ?? `Fail reason: ${failReason}`
}

/**
 * Human-readable campaign outcome rationale for UI summary surfaces.
 */
export function describeEndingOutcome(endingType: EndingType | undefined, failReason?: string): string {
  if (!endingType) {
    return 'Campaign is still in progress.'
  }
  if (endingType === 'strategic_success') {
    return 'All mandate thresholds were met with sustained late-phase stability.'
  }
  if (endingType === 'fragile_success') {
    return 'Thresholds were met, but late-phase risk signals indicate a fragile settlement.'
  }
  if (endingType === 'stalemate') {
    return 'The mission avoided collapse but missed enough thresholds to block a full success outcome.'
  }
  if (endingType === 'regional_setback') {
    return 'Too many mandate thresholds were missed or critical-zone persistence prevented a positive ending.'
  }
  return describeFailReason(failReason)
}

/**
 * Resolve delayed effects due at or before nextTurn; apply to session.metrics.
 * Returns updated metrics and remaining delayed_effects.
 */
export function resolveDelayedEffects(
  state: GameState,
  nextTurn: number
): { metrics: Metrics; resources: Resources; ai_state: AiState; delayed_effects: DelayedEffect[] } {
  const due = state.delayed_effects ?? []
  const remaining: DelayedEffect[] = []
  let metrics = { ...state.session.metrics }
  let resources = { ...state.session.resources }
  let ai_state = { ...state.session.ai_state }

  for (const effect of due) {
    if (effect.turn_due <= nextTurn) {
      if (effect.metrics) {
        for (const key of METRIC_KEYS) {
          const delta = effect.metrics[key]
          if (delta !== undefined) {
            metrics[key] = clampMetric(metrics[key] + delta)
          }
        }
      }
      if (effect.resources) {
        resources = {
          budget:
            effect.resources.budget !== undefined
              ? clampResource(resources.budget + effect.resources.budget)
              : resources.budget,
          political_capital:
            effect.resources.political_capital !== undefined
              ? clampResource(resources.political_capital + effect.resources.political_capital)
              : resources.political_capital,
          personnel:
            effect.resources.personnel !== undefined
              ? clampResource(resources.personnel + effect.resources.personnel)
              : resources.personnel,
          intel_points:
            effect.resources.intel_points !== undefined
              ? clampResource(resources.intel_points + effect.resources.intel_points)
              : resources.intel_points,
          time_months:
            effect.resources.time_months !== undefined
              ? clampResource(resources.time_months + effect.resources.time_months)
              : resources.time_months,
        }
      }
      if (effect.ai_state) {
        ai_state = {
          opposition_pressure:
            effect.ai_state.opposition_pressure !== undefined
              ? clampAiState(ai_state.opposition_pressure + effect.ai_state.opposition_pressure)
              : ai_state.opposition_pressure,
          intel_confidence:
            effect.ai_state.intel_confidence !== undefined
              ? clampAiState(ai_state.intel_confidence + effect.ai_state.intel_confidence)
              : ai_state.intel_confidence,
        }
      }
    } else {
      remaining.push(effect)
    }
  }

  return { metrics, resources, ai_state, delayed_effects: remaining }
}

/**
 * Aggregate threat from zone_state for drift. Zone weight = population or 1.
 * Tthreat = sum(weight * zoneThreat) / sum(weight). If no zones, return undefined (use fallback).
 */
function getAggregateThreat(state: GameState): number | undefined {
  const zones = state.zone_state
  if (!zones) return undefined
  let sumWeightThreat = 0
  let sumWeight = 0
  for (const z of Object.values(zones)) {
    const weight = z.population > 0 ? z.population : 1
    sumWeightThreat += weight * z.threat_level
    sumWeight += weight
  }
  if (sumWeight === 0) return undefined
  return sumWeightThreat / sumWeight
}

/**
 * Count zones with threat_level >= 75.
 */
function getCriticalZoneCount(state: GameState): number {
  const zones = state.zone_state
  if (!zones) return 0
  let n = 0
  for (const z of Object.values(zones)) {
    if (z.threat_level >= 75) n++
  }
  return n
}

/**
 * Apply per-turn drift to global metrics (FULL_GAME_SYSTEM_DESIGN).
 * baseDelta = (50 - Tthreat) / 20; stability += baseDelta, insurgency -= baseDelta;
 * criticalCount zones >= 75: stability -= min(criticalCount * 0.5, 2), insurgency += same.
 */
export function applyDrift(state: GameState, metrics: Metrics): Metrics {
  const Tthreat = getAggregateThreat(state) ?? 0.6 * metrics.insurgency + 0.4 * (100 - metrics.stability)
  const baseDelta = (50 - Tthreat) / 20
  let stability = metrics.stability + baseDelta
  let insurgency = metrics.insurgency - baseDelta
  const criticalCount = getCriticalZoneCount(state)
  stability -= Math.min(criticalCount * 0.5, 2)
  insurgency += Math.min(criticalCount * 0.5, 2)
  return {
    ...metrics,
    stability: clampMetric(stability),
    insurgency: clampMetric(insurgency),
  }
}

/**
 * AI Director: add opposition_pressure based on metrics (FULL_GAME_SYSTEM_DESIGN).
 * If stability < 45 for 2 turns, AI increases pressure (+5).
 * If global_legitimacy < 45, +5. If civilian_support < 45, +5.
 * Category spam (+10) requires actions_log; skipped here.
 */
export function applyAiDirector(
  state: GameState,
  metrics: Metrics,
  metricHistory: Record<number, Metrics> | undefined
): number {
  const turn = state.session.turn
  const prev = turn >= 2 ? metricHistory?.[turn - 1] : undefined
  let pressure = state.session.ai_state.opposition_pressure

  if (prev && prev.stability < 45 && metrics.stability < 45) {
    pressure += 5
  }
  if (metrics.global_legitimacy < 45) {
    pressure += 5
  }
  if (metrics.civilian_support < 45) {
    pressure += 5
  }

  return Math.min(100, pressure)
}

/**
 * Consume time_months for the current turn. turn_duration_months is 1-based (index 0 = turn 1).
 */
function consumeTurnTime(
  state: GameState,
  turn: number
): number {
  const durations = state.config.turn_duration_months
  if (!durations || turn < 1 || turn > durations.length) return state.session.resources.time_months
  const consumed = durations[turn - 1] ?? 0
  return Math.max(0, state.session.resources.time_months - consumed)
}

/**
 * Check if a metric is in critical band (for 3-turn streak).
 */
function isCriticalStability(m: Metrics): boolean {
  return m.stability <= CRITICAL_LOW
}
function isCriticalInsurgency(m: Metrics): boolean {
  return m.insurgency >= CRITICAL_HIGH_INSURGENCY
}
function isCriticalCivilianSupport(m: Metrics): boolean {
  return m.civilian_support <= CRITICAL_LOW
}
function isCriticalGlobalLegitimacy(m: Metrics): boolean {
  return m.global_legitimacy <= CRITICAL_LOW
}
function isCriticalRegionalSynergy(m: Metrics): boolean {
  return m.regional_synergy <= CRITICAL_LOW
}

/**
 * Early-fail check (WIN_LOSS_SCORING_SPEC). Returns { failed, fail_reason }.
 * Run every turn including Turn 20.
 */
export function checkEarlyFail(
  state: GameState,
  metricHistory: Record<number, Metrics> | undefined,
  currentMetrics: Metrics
): { failed: boolean; fail_reason?: string } {
  const turn = state.session.turn

  if (state.session.resources.time_months <= 0 && turn < 20) {
    return { failed: true, fail_reason: 'time_expiry' }
  }

  const m2 = turn >= 3 ? metricHistory?.[turn - 2] : undefined
  const m1 = turn >= 2 ? metricHistory?.[turn - 1] : undefined

  const check3 = (fn: (m: Metrics) => boolean): boolean =>
    !!(m2 && m1 && fn(m2) && fn(m1) && fn(currentMetrics))

  if (check3(isCriticalStability)) return { failed: true, fail_reason: 'critical_streak_stability' }
  if (check3(isCriticalInsurgency)) return { failed: true, fail_reason: 'critical_streak_insurgency' }
  if (check3(isCriticalCivilianSupport)) return { failed: true, fail_reason: 'critical_streak_civilian_support' }
  if (check3(isCriticalGlobalLegitimacy)) return { failed: true, fail_reason: 'critical_streak_global_legitimacy' }
  if (check3(isCriticalRegionalSynergy)) return { failed: true, fail_reason: 'critical_streak_regional_synergy' }

  return { failed: false }
}

/** Win thresholds (WIN_LOSS_SCORING_SPEC). */
const WIN = {
  stability: 55,
  insurgency: 45,
  civilian_support: 50,
  global_legitimacy: 55,
  regional_synergy: 55,
} as const

function thresholdsMetAll(m: Metrics): boolean {
  return (
    m.stability >= WIN.stability &&
    m.insurgency <= WIN.insurgency &&
    m.civilian_support >= WIN.civilian_support &&
    m.global_legitimacy >= WIN.global_legitimacy &&
    m.regional_synergy >= WIN.regional_synergy
  )
}

function thresholdsMissedCount(m: Metrics): number {
  let n = 0
  if (m.stability < WIN.stability) n++
  if (m.insurgency > WIN.insurgency) n++
  if (m.civilian_support < WIN.civilian_support) n++
  if (m.global_legitimacy < WIN.global_legitimacy) n++
  if (m.regional_synergy < WIN.regional_synergy) n++
  return n
}

/** Positive metrics in High range (50-74). */
function anyPositiveMetricInHighRange(m: Metrics): boolean {
  return (
    (m.stability >= 50 && m.stability <= 74) ||
    (m.civilian_support >= 50 && m.civilian_support <= 74) ||
    (m.global_legitimacy >= 50 && m.global_legitimacy <= 74) ||
    (m.regional_synergy >= 50 && m.regional_synergy <= 74)
  )
}

function criticalMetricsInT19T20(
  m19: Metrics | undefined,
  m20: Metrics
): boolean {
  if (!m19) return false
  const critical = (m: Metrics) =>
    m.stability <= CRITICAL_LOW ||
    m.insurgency >= CRITICAL_HIGH_INSURGENCY ||
    m.civilian_support <= CRITICAL_LOW ||
    m.global_legitimacy <= CRITICAL_LOW ||
    m.regional_synergy <= CRITICAL_LOW
  return critical(m19) || critical(m20)
}

function criticalZonePersists(
  zoneThreat19: Record<string, number> | undefined,
  zoneState: Record<string, ZoneState> | undefined
): boolean {
  if (!zoneThreat19 || !zoneState) return false
  for (const [zoneId, threat19] of Object.entries(zoneThreat19)) {
    if (threat19 >= 75) {
      const z = zoneState[zoneId]
      if (z && z.threat_level >= 75) return true
    }
  }
  return false
}

/**
 * Evaluate ending type at Turn 20 (WIN_LOSS_SCORING_SPEC pseudocode).
 */
export function evaluateEnding(state: GameState): EndingType {
  const m20 = state.session.metrics
  const m19 = state.metric_snapshot_turn_19
  const zone19 = state.zone_threat_snapshot_turn_19
  const zones = state.zone_state
  const criticalZone = criticalZonePersists(zone19, zones)

  if (thresholdsMetAll(m20)) {
    if (criticalZone) return 'regional_setback'
    if (criticalMetricsInT19T20(m19, m20)) return 'fragile_success'
    if (anyPositiveMetricInHighRange(m20)) return 'fragile_success'
    return 'strategic_success'
  }

  const missed = thresholdsMissedCount(m20)
  if (missed <= 2) {
    if (criticalZone) return 'regional_setback'
    return 'stalemate'
  }

  return 'regional_setback'
}

/**
 * Advance turn: resolve delayed effects, apply drift, AI director, consume time,
 * record metric history, check early-fail, evaluate endgame at Turn 20.
 * Returns new state. If game ends (early-fail or Turn 20), ending_type and optional fail_reason are set; turn is not advanced past 20.
 */
export function advanceTurn(state: GameState): GameState {
  const { session, config } = state
  const turn = session.turn

  if (turn > config.total_turns) {
    throw new GameError(`Turn ${turn} exceeds max_turns ${config.total_turns}`, 'INVALID_TURN')
  }

  const nextTurn = Math.min(turn + 1, config.total_turns + 1)
  const {
    metrics: metricsAfterDelayed,
    resources: resourcesAfterDelayed,
    ai_state: aiStateAfterDelayed,
    delayed_effects,
  } = resolveDelayedEffects(state, nextTurn)
  const metricsAfterDrift = applyDrift(
    { ...state, session: { ...session, metrics: metricsAfterDelayed } },
    metricsAfterDelayed
  )
  const metricHistory = { ...(state.metric_history ?? {}), [turn]: metricsAfterDrift }
  const newPressure = applyAiDirector(
    {
      ...state,
      session: {
        ...session,
        metrics: metricsAfterDrift,
        resources: resourcesAfterDelayed,
        ai_state: aiStateAfterDelayed,
      },
    },
    metricsAfterDrift,
    state.metric_history
  )
  const timeMonths = consumeTurnTime(state, turn)

  let nextState: GameState = {
    ...state,
    session: {
      ...session,
      metrics: metricsAfterDrift,
      ai_state: { ...aiStateAfterDelayed, opposition_pressure: newPressure },
      resources: {
        ...resourcesAfterDelayed,
        time_months: timeMonths,
      },
    },
    delayed_effects,
    metric_history: metricHistory,
  }

  const eventResolution = resolveRuntimeEvents(nextState)
  nextState = {
    ...eventResolution.state,
    metric_history: {
      ...(eventResolution.state.metric_history ?? {}),
      [turn]: { ...eventResolution.state.session.metrics },
    },
  }

  if (eventResolution.deadlineFailReason) {
    return {
      ...nextState,
      ending_type: 'mandate_revoked',
      fail_reason: eventResolution.deadlineFailReason,
    }
  }

  const earlyFail = checkEarlyFail(nextState, state.metric_history, nextState.session.metrics)
  if (earlyFail.failed) {
    return {
      ...nextState,
      ending_type: 'mandate_revoked',
      fail_reason: earlyFail.fail_reason,
    }
  }

  if (turn === 20) {
    return {
      ...nextState,
      ending_type: evaluateEnding(nextState),
    }
  }

  if (turn === 19) {
    nextState = {
      ...nextState,
      metric_snapshot_turn_19: { ...metricsAfterDrift },
      zone_threat_snapshot_turn_19: (() => {
        const zs = nextState.zone_state
        if (!zs) return undefined
        const out: Record<string, number> = {}
        for (const [id, z] of Object.entries(zs)) {
          out[id] = z.threat_level
        }
        return out
      })(),
    }
  }

  return {
    ...nextState,
    session: {
      ...nextState.session,
      turn: nextTurn <= config.total_turns ? nextTurn : turn,
      actions_remaining: config.action_slots_per_turn,
    },
  }
}
