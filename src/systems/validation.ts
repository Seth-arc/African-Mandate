/**
 * Input validation and bounds. REQUIRED_KEYS_AND_CONSTRAINTS:
 * - All metrics 0–100
 * - All resources >= 0
 * - turn in range [1, total_turns]
 * - actions_remaining <= action_slots_per_turn
 * Pure functions; throw GameError on invalid input.
 */

import type {
  ActorSentiment,
  GameConfig,
  GameSession,
  GameState,
  Metrics,
  Resources,
  TerritoryState,
  ZoneState,
} from '../state/types'
import { GameError } from '../state/types'

const METRIC_KEYS: (keyof Metrics)[] = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
]

const RESOURCE_KEYS: (keyof Resources)[] = [
  'budget',
  'political_capital',
  'personnel',
  'intel_points',
  'time_months',
]

/**
 * Validate metrics: each value must be in [0, 100].
 * Throws GameError with code INVALID_METRICS if any value is out of bounds.
 */
export function validateMetrics(metrics: Metrics): void {
  for (const key of METRIC_KEYS) {
    const value = metrics[key]
    if (typeof value !== 'number' || value < 0 || value > 100) {
      throw new GameError(
        `Metric ${key} must be 0–100, got ${value}`,
        'INVALID_METRICS'
      )
    }
  }
}

/**
 * Validate resources: each value must be >= 0.
 * Throws GameError with code INVALID_RESOURCES if any value is negative.
 */
export function validateResources(resources: Resources): void {
  for (const key of RESOURCE_KEYS) {
    const value = resources[key]
    if (typeof value !== 'number' || value < 0) {
      throw new GameError(
        `Resource ${key} must be >= 0, got ${value}`,
        'INVALID_RESOURCES'
      )
    }
  }
}

/**
 * Validate turn is in range [1, total_turns].
 * Throws GameError with code INVALID_TURN if out of range.
 */
export function validateTurn(state: {
  session: { turn: number }
  config: { total_turns: number }
}): void {
  const { turn } = state.session
  const { total_turns } = state.config
  if (typeof turn !== 'number' || turn < 1 || turn > total_turns) {
    throw new GameError(
      `Turn must be 1–${total_turns}, got ${turn}`,
      'INVALID_TURN'
    )
  }
}

/**
 * Validate actions_remaining is in [0, action_slots_per_turn].
 * Throws GameError with code INVALID_ACTIONS_REMAINING if out of bounds.
 */
export function validateActionsRemaining(state: {
  session: { actions_remaining: number }
  config: { action_slots_per_turn: number }
}): void {
  const { actions_remaining } = state.session
  const { action_slots_per_turn } = state.config
  if (
    typeof actions_remaining !== 'number' ||
    actions_remaining < 0 ||
    actions_remaining > action_slots_per_turn
  ) {
    throw new GameError(
      `actions_remaining must be 0–${action_slots_per_turn}, got ${actions_remaining}`,
      'INVALID_ACTIONS_REMAINING'
    )
  }
}

/**
 * Validate session bounds: turn, actions_remaining, metrics, resources.
 * Throws GameError with the appropriate code on first failure.
 */
export function validateSession(
  session: GameSession,
  config: GameConfig
): void {
  validateTurn({ session, config })
  validateActionsRemaining({ session, config })
  validateMetrics(session.metrics)
  validateResources(session.resources)
  const { opposition_pressure, intel_confidence } = session.ai_state
  if (
    typeof opposition_pressure !== 'number' ||
    opposition_pressure < 0 ||
    opposition_pressure > 100
  ) {
    throw new GameError(
      `ai_state.opposition_pressure must be 0–100, got ${opposition_pressure}`,
      'INVALID_METRICS'
    )
  }
  if (
    typeof intel_confidence !== 'number' ||
    intel_confidence < 0 ||
    intel_confidence > 100
  ) {
    throw new GameError(
      `ai_state.intel_confidence must be 0–100, got ${intel_confidence}`,
      'INVALID_METRICS'
    )
  }
}

function validateTerritoryState(territoryState: Record<string, TerritoryState> | undefined): void {
  if (!territoryState) return

  for (const [territoryKey, territory] of Object.entries(territoryState)) {
    if (!territory.name) {
      throw new GameError(`Territory ${territoryKey} is missing a resolved name`, 'INVALID_TERRITORY_STATE')
    }
    if (territory.population < 0) {
      throw new GameError(
        `Territory ${territoryKey} population must be >= 0, got ${territory.population}`,
        'INVALID_TERRITORY_STATE'
      )
    }
    if (territory.stability < 0 || territory.stability > 100) {
      throw new GameError(
        `Territory ${territoryKey} stability must be 0-100, got ${territory.stability}`,
        'INVALID_TERRITORY_STATE'
      )
    }
    if (territory.insurgency < 0 || territory.insurgency > 100) {
      throw new GameError(
        `Territory ${territoryKey} insurgency must be 0-100, got ${territory.insurgency}`,
        'INVALID_TERRITORY_STATE'
      )
    }
  }
}

function validateZoneState(zoneState: Record<string, ZoneState> | undefined): void {
  if (!zoneState) return

  for (const [zoneId, zone] of Object.entries(zoneState)) {
    const metricsToValidate = [
      ['stability', zone.stability],
      ['insurgency', zone.insurgency],
      ['civilian_support', zone.civilian_support],
      ['threat_level', zone.threat_level],
    ] as const

    for (const [metricKey, value] of metricsToValidate) {
      if (value < 0 || value > 100) {
        throw new GameError(
          `Zone ${zoneId} ${metricKey} must be 0-100, got ${value}`,
          'INVALID_ZONE_STATE'
        )
      }
    }

    if (zone.population < 0) {
      throw new GameError(`Zone ${zoneId} population must be >= 0, got ${zone.population}`, 'INVALID_ZONE_STATE')
    }
    if (zone.displaced < 0) {
      throw new GameError(`Zone ${zoneId} displaced must be >= 0, got ${zone.displaced}`, 'INVALID_ZONE_STATE')
    }
  }
}

function validateActorSentiments(actorSentiments: Record<string, ActorSentiment> | undefined): void {
  if (!actorSentiments) return

  for (const [actorKey, sentiment] of Object.entries(actorSentiments)) {
    if (sentiment.relationship_score < 0 || sentiment.relationship_score > 100) {
      throw new GameError(
        `Actor ${actorKey} relationship_score must be 0-100, got ${sentiment.relationship_score}`,
        'INVALID_ACTOR_STATE'
      )
    }
    if (!sentiment.dialogue_state) {
      throw new GameError(`Actor ${actorKey} dialogue_state is required`, 'INVALID_ACTOR_STATE')
    }
  }
}

function validateIntelFeed(state: GameState): void {
  const feed = state.intel_feed
  if (!feed) return

  const knownReportKeys = new Set(state.content?.intel_reports.intel_reports.map((report) => report.report_key) ?? [])
  for (const item of feed) {
    if (item.occurred_at < 0) {
      throw new GameError(
        `Intel feed item ${item.report_key} occurred_at must be >= 0, got ${item.occurred_at}`,
        'INVALID_INTEL_FEED'
      )
    }
    if (knownReportKeys.size > 0 && !knownReportKeys.has(item.report_key)) {
      throw new GameError(
        `Intel feed item references unknown report ${item.report_key}`,
        'INVALID_INTEL_FEED'
      )
    }
  }
}

function validateRuntimeGovernanceState(state: GameState): void {
  const oversight = state.oversight_level
  if (oversight) {
    if (oversight.level !== 'none' && oversight.level !== 'basic' && oversight.level !== 'strong') {
      throw new GameError(
        `oversight_level.level must be one of none|basic|strong, got ${oversight.level}`,
        'INVALID_RUNTIME_STATE'
      )
    }
    if (oversight.set_on_turn < 1) {
      throw new GameError(
        `oversight_level.set_on_turn must be >= 1, got ${oversight.set_on_turn}`,
        'INVALID_RUNTIME_STATE'
      )
    }
  }

  const audit = state.audit_status
  if (audit) {
    if (audit.status !== 'none' && audit.status !== 'pending' && audit.status !== 'passed' && audit.status !== 'failed') {
      throw new GameError(
        `audit_status.status must be one of none|pending|passed|failed, got ${audit.status}`,
        'INVALID_RUNTIME_STATE'
      )
    }
    if (audit.set_on_turn !== null && audit.set_on_turn < 1) {
      throw new GameError(
        `audit_status.set_on_turn must be null or >= 1, got ${audit.set_on_turn}`,
        'INVALID_RUNTIME_STATE'
      )
    }
  }
}

function validateActiveEvents(state: GameState): void {
  const activeEvents = state.active_events
  if (!activeEvents) return

  for (const event of activeEvents) {
    if (event.trigger_turn < 1) {
      throw new GameError(`active event ${event.event_id} trigger_turn must be >= 1`, 'INVALID_RUNTIME_STATE')
    }
    if (event.deadline_turn !== null && event.deadline_turn < 1) {
      throw new GameError(`active event ${event.event_id} deadline_turn must be >= 1`, 'INVALID_RUNTIME_STATE')
    }
    if (event.status !== 'active' && event.status !== 'resolved' && event.status !== 'expired') {
      throw new GameError(`active event ${event.event_id} has invalid status ${event.status}`, 'INVALID_RUNTIME_STATE')
    }
  }
}

/**
 * Validate full game state bounds: session (turn, actions_remaining, metrics, resources, ai_state).
 * Use after load or before critical operations. Throws GameError on invalid input.
 */
export function validateGameState(state: GameState): void {
  validateSession(state.session, state.config)
  validateTerritoryState(state.territory_state)
  validateZoneState(state.zone_state)
  validateActorSentiments(state.actor_sentiments)
  validateIntelFeed(state)
  validateRuntimeGovernanceState(state)
  validateActiveEvents(state)
}
