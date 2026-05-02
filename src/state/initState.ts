import type {
  ActorSentiment,
  GameConfig,
  GameContent,
  GameState,
  IntelFeedItem,
  TerritoryKey,
  TerritoryState,
  ZoneState,
} from './types'
import { GameError } from './types'
import {
  deriveActorStance,
  deriveDialogueState,
  deriveZoneThreatLevel,
  relationshipLabelFromScore,
  resolveLocalizedText,
  threatLevelToStatus,
} from './selectors'
import { validateGameState } from '../systems/validation'

function buildTerritoryState(content: GameContent): Record<TerritoryKey, TerritoryState> {
  const zoneThreatTotals = new Map<TerritoryKey, { weightedThreat: number; totalPopulation: number }>()

  for (const zone of content.zones.zones) {
    const threatLevel = deriveZoneThreatLevel(zone.base_stability, zone.base_insurgency)
    const current = zoneThreatTotals.get(zone.territory_key) ?? { weightedThreat: 0, totalPopulation: 0 }
    zoneThreatTotals.set(zone.territory_key, {
      weightedThreat: current.weightedThreat + threatLevel * zone.population,
      totalPopulation: current.totalPopulation + zone.population,
    })
  }

  return content.territories.territories.reduce<Record<TerritoryKey, TerritoryState>>((acc, territory) => {
    const aggregate = zoneThreatTotals.get(territory.territory_key)
    const derivedThreat =
      aggregate && aggregate.totalPopulation > 0
        ? Math.round(aggregate.weightedThreat / aggregate.totalPopulation)
        : deriveZoneThreatLevel(territory.base_metrics.stability, territory.base_metrics.insurgency)

    acc[territory.territory_key] = {
      territory_key: territory.territory_key,
      name: resolveLocalizedText(content.localization, territory.name_key),
      stability: territory.base_metrics.stability,
      insurgency: territory.base_metrics.insurgency,
      status: threatLevelToStatus(derivedThreat),
      population: territory.population,
      coords: { ...territory.coords },
    }
    return acc
  }, {} as Record<TerritoryKey, TerritoryState>)
}

function buildZoneState(content: GameContent): Record<string, ZoneState> {
  const territoryByKey = new Map(
    content.territories.territories.map((territory) => [territory.territory_key, territory])
  )
  const zoneSeedById = new Map(
    content.zone_runtime_seed.zone_runtime_seed.map((seed) => [seed.zone_id, seed])
  )

  for (const seed of content.zone_runtime_seed.zone_runtime_seed) {
    const zoneExists = content.zones.zones.some((zone) => zone.zone_id === seed.zone_id)
    if (!zoneExists) {
      throw new GameError(
        `Zone runtime seed references unknown zone ${seed.zone_id}`,
        'INVALID_CONTENT'
      )
    }
  }

  return content.zones.zones.reduce<Record<string, ZoneState>>((acc, zone) => {
    const territory = territoryByKey.get(zone.territory_key)
    const seed = zoneSeedById.get(zone.zone_id)
    if (!territory) {
      throw new GameError(
        `Zone ${zone.zone_id} references unknown territory ${zone.territory_key}`,
        'INVALID_CONTENT'
      )
    }

    acc[zone.zone_id] = {
      zone_id: zone.zone_id,
      territory_key: zone.territory_key,
      stability: zone.base_stability,
      insurgency: zone.base_insurgency,
      civilian_support: territory.base_metrics.civilian_support,
      threat_level: deriveZoneThreatLevel(zone.base_stability, zone.base_insurgency),
      population: zone.population,
      displaced: seed?.displaced ?? 0,
      threats: seed?.threats ? [...seed.threats] : [],
      incidents: seed?.incidents ? [...seed.incidents] : [],
      actors_present: seed?.actors_present ? [...seed.actors_present] : [],
    }
    return acc
  }, {})
}

function buildActorSentiments(content: GameContent): Record<string, ActorSentiment> {
  return content.actors.actors.reduce<Record<string, ActorSentiment>>((acc, actor) => {
    if (!actor.relationship_tracked || actor.default_relationship_score === null) {
      return acc
    }

    const relationship_label = relationshipLabelFromScore(actor.default_relationship_score)
    acc[actor.actor_key] = {
      actor_key: actor.actor_key,
      sentiment: actor.default_sentiment,
      relationship_score: actor.default_relationship_score,
      relationship_label,
      stance: deriveActorStance(relationship_label),
      dialogue_state: deriveDialogueState(actor),
    }
    return acc
  }, {})
}

function buildIntelFeed(content: GameContent): IntelFeedItem[] {
  return content.intel_reports.intel_reports.map((report) => {
    const urgency = report.urgency.toLowerCase()
    return {
      report_key: report.report_key,
      is_urgent: urgency === 'high' || urgency === 'critical',
      occurred_at: 1,
      is_read: false,
    }
  })
}

/**
 * Build initial GameState from loaded game_config.
 * All values from project data (game_config.json); no invented values.
 */
export function createInitialState(config: GameConfig, content?: GameContent): GameState {
  const state: GameState = {
    config,
    session: {
      turn: 1,
      actions_remaining: config.action_slots_per_turn,
      max_turns: config.total_turns,
      resources: { ...config.starting_resources },
      metrics: { ...config.starting_metrics },
      ai_state: { ...config.starting_ai_state },
    },
    action_log: [],
  }

  if (content) {
    state.content = content
    state.territory_state = buildTerritoryState(content)
    state.zone_state = buildZoneState(content)
    state.actor_sentiments = buildActorSentiments(content)
    state.intel_feed = buildIntelFeed(content)
    state.narrative_flags = {}
    state.narrative_flag_turns = {}
    state.oversight_level = {
      level: 'none',
      set_on_turn: 1,
    }
    state.audit_status = {
      status: 'none',
      set_on_turn: null,
    }
    state.corruption_flags = {}
    state.active_events = []
    state.event_log = []
  }

  validateGameState(state)
  return state
}
