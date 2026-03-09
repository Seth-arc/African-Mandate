import { create } from 'zustand'
import type {
  ActionDefinition,
  GameContent,
  GameState,
  StrategicValue,
  TerritoryKey,
  ZoneType,
} from './types'
import { createInitialState } from './initState'
import gameConfigJson from '../data/game_config.json'
import territoriesJson from '../data/territories.json'
import zonesJson from '../data/zones.json'
import zoneRuntimeSeedJson from '../data/zone_runtime_seed.json'
import actorsJson from '../data/actors.json'
import intelReportsJson from '../data/intel_reports.json'
import actionsJson from '../data/actions.json'
import dialoguesJson from '../data/dialogues.json'
import eventsYamlRaw from '../data/events.yaml?raw'
import cutscenesJson from '../data/cutscenes.json'
import localizationJson from '../data/localization_en.json'
import { parseEventsYaml } from '../data/eventsLoader'

const TERRITORY_KEYS: TerritoryKey[] = [
  'mali',
  'burkina_faso',
  'niger',
  'chad',
  'mauritania',
]

const ZONE_TYPES: ZoneType[] = [
  'capital',
  'conflict_hotspot',
  'border_region',
  'remote_contested',
  'humanitarian_crisis',
  'urban_center',
]

const STRATEGIC_VALUES: StrategicValue[] = ['critical', 'high', 'medium', 'low']

function toTerritoryKey(value: string): TerritoryKey {
  if (TERRITORY_KEYS.includes(value as TerritoryKey)) {
    return value as TerritoryKey
  }
  throw new Error(`Unknown territory_key in content: ${value}`)
}

function toZoneType(value: string): ZoneType {
  if (ZONE_TYPES.includes(value as ZoneType)) {
    return value as ZoneType
  }
  throw new Error(`Unknown zone_type in content: ${value}`)
}

function toStrategicValue(value: string): StrategicValue {
  if (STRATEGIC_VALUES.includes(value as StrategicValue)) {
    return value as StrategicValue
  }
  throw new Error(`Unknown strategic_value in content: ${value}`)
}

function toTargetScope(value: string): ActionDefinition['target_scope'] {
  if (value === 'zone' || value === 'territory' || value === 'actor') {
    return value
  }
  throw new Error(`Unknown action target_scope in content: ${value}`)
}

function toOversightLevel(
  value: string | undefined
): ActionDefinition['effects']['sets_oversight_level'] {
  if (value === undefined) return undefined
  if (value === 'none' || value === 'basic' || value === 'strong') {
    return value
  }
  throw new Error(`Unknown action effects.sets_oversight_level in content: ${value}`)
}

function toAuditStatus(
  value: string | undefined
): ActionDefinition['effects']['sets_audit_status'] {
  if (value === undefined) return undefined
  if (value === 'none' || value === 'pending' || value === 'passed' || value === 'failed') {
    return value
  }
  throw new Error(`Unknown action effects.sets_audit_status in content: ${value}`)
}

function copyNumberRecord(
  source: Record<string, number | undefined> | undefined
): Record<string, number> | undefined {
  if (!source) return undefined
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, number] => typeof entry[1] === 'number')
  )
}

function validateContentConsistency(content: GameContent): void {
  const territoryKeys = new Set(content.territories.territories.map((territory) => territory.territory_key))
  const zoneIds = new Set<string>()

  for (const zone of content.zones.zones) {
    if (zoneIds.has(zone.zone_id)) {
      throw new Error(`Duplicate zone_id in content: ${zone.zone_id}`)
    }
    zoneIds.add(zone.zone_id)

    if (!territoryKeys.has(zone.territory_key)) {
      throw new Error(
        `Zone ${zone.zone_id} references unknown territory_key ${zone.territory_key}`
      )
    }
  }

  for (const zone of content.zones.zones) {
    for (const adjacentZoneId of zone.adjacent_zones) {
      if (!zoneIds.has(adjacentZoneId)) {
        throw new Error(
          `Zone ${zone.zone_id} has unknown adjacent zone ${adjacentZoneId}`
        )
      }
    }
  }

  const seedIds = new Set<string>()
  for (const seed of content.zone_runtime_seed.zone_runtime_seed) {
    if (seedIds.has(seed.zone_id)) {
      throw new Error(`Duplicate zone_runtime_seed entry for ${seed.zone_id}`)
    }
    seedIds.add(seed.zone_id)
    if (!zoneIds.has(seed.zone_id)) {
      throw new Error(`zone_runtime_seed references unknown zone ${seed.zone_id}`)
    }
  }
}

function loadConfig(): GameState['config'] {
  const gc = gameConfigJson.game_config as Record<string, unknown> & GameState['config']
  return {
    total_turns: gc.total_turns,
    action_slots_per_turn: gc.action_slots_per_turn,
    starting_resources: { ...gc.starting_resources },
    starting_metrics: { ...gc.starting_metrics },
    starting_ai_state: { ...gc.starting_ai_state },
    win_conditions: { ...gc.win_conditions },
    critical_thresholds: { ...gc.critical_thresholds },
    default_action_cooldown_turns: gc.default_action_cooldown_turns,
    default_intel_gate: gc.default_intel_gate,
    turn_duration_months: Array.isArray(gc.turn_duration_months) ? [...gc.turn_duration_months] : undefined,
  }
}

function loadContent(): GameContent {
  const events = parseEventsYaml(eventsYamlRaw)
  const content: GameContent = {
    territories: {
      ...territoriesJson,
      territories: territoriesJson.territories.map((territory) => ({
        ...territory,
        territory_key: toTerritoryKey(territory.territory_key),
        coords: { ...territory.coords },
        base_metrics: { ...territory.base_metrics },
      })),
    },
    zones: {
      ...zonesJson,
      zones: zonesJson.zones.map((zone) => ({
        ...zone,
        territory_key: toTerritoryKey(zone.territory_key),
        zone_type: toZoneType(zone.zone_type),
        strategic_value: toStrategicValue(zone.strategic_value),
        coords: { ...zone.coords },
        ethnic_groups: [...zone.ethnic_groups],
        adjacent_zones: [...zone.adjacent_zones],
      })),
    },
    zone_runtime_seed: {
      ...zoneRuntimeSeedJson,
      zone_runtime_seed: zoneRuntimeSeedJson.zone_runtime_seed.map((seed) => ({
        ...seed,
        threats: seed.threats ? [...seed.threats] : undefined,
        incidents: seed.incidents ? [...seed.incidents] : undefined,
        actors_present: seed.actors_present ? [...seed.actors_present] : undefined,
        source_refs: seed.source_refs ? [...seed.source_refs] : undefined,
      })),
    },
    actors: {
      ...actorsJson,
      actors: actorsJson.actors.map((actor) => ({ ...actor })),
    },
    intel_reports: {
      ...intelReportsJson,
      intel_reports: intelReportsJson.intel_reports.map((report) => ({
        ...report,
        sources: [...report.sources],
      })),
    },
    actions: {
      ...actionsJson,
      actions: actionsJson.actions.map((action) => ({
        ...action,
        target_scope: toTargetScope(action.target_scope),
        target_actors: action.target_actors ? [...action.target_actors] : undefined,
        tags: action.tags ? [...action.tags] : undefined,
        unlocks_dialogue: action.unlocks_dialogue,
        costs: {
          budget: { ...action.costs.budget },
          personnel: { ...action.costs.personnel },
          political_capital: { ...action.costs.political_capital },
          intel_points: { ...action.costs.intel_points },
          time_months: { ...action.costs.time_months },
        },
        effects: {
          metrics: action.effects.metrics ? { ...action.effects.metrics } : undefined,
          resources: action.effects.resources ? { ...action.effects.resources } : undefined,
          ai_state: action.effects.ai_state ? { ...action.effects.ai_state } : undefined,
          zone_effects: copyNumberRecord(action.effects.zone_effects),
          actor_effects: action.effects.actor_effects ? { ...action.effects.actor_effects } : undefined,
          flags: action.effects.flags ? [...action.effects.flags] : undefined,
          sets_oversight_level: toOversightLevel(action.effects.sets_oversight_level),
          sets_audit_status: toAuditStatus(action.effects.sets_audit_status),
          risks: action.effects.risks
            ? {
                civilian_harm_chance: action.effects.risks.civilian_harm_chance,
                civilian_harm_effects: action.effects.risks.civilian_harm_effects
                  ? { ...action.effects.risks.civilian_harm_effects }
                  : undefined,
              }
            : undefined,
        },
        requirements: action.requirements
          ? {
              ...action.requirements,
              flags_required: action.requirements.flags_required
                ? [...action.requirements.flags_required]
                : undefined,
              condition: action.requirements.condition,
            }
          : undefined,
        delayed_effects: action.delayed_effects
          ? {
              metrics: action.delayed_effects.metrics
                ? { ...action.delayed_effects.metrics }
                : undefined,
              resources: action.delayed_effects.resources
                ? { ...action.delayed_effects.resources }
                : undefined,
              ai_state: 'ai_state' in action.delayed_effects && action.delayed_effects.ai_state
                ? { ...action.delayed_effects.ai_state }
                : undefined,
            }
          : undefined,
      })),
    },
    dialogues: dialoguesJson as GameContent['dialogues'],
    events,
    cutscenes: cutscenesJson as GameContent['cutscenes'],
    localization: localizationJson as GameContent['localization'],
  }

  validateContentConsistency(content)
  return content
}

interface GameStore {
  state: GameState
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => {
  const config = loadConfig()
  const content = loadContent()
  const initialState = createInitialState(config, content)
  return {
    state: initialState,
    reset: () => set({ state: createInitialState(loadConfig(), loadContent()) }),
  }
})
