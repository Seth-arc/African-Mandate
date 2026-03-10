import type { GameState, TerritoryKey, TerritoryState, TerritoryStatus, ZoneState } from './types'
import { deriveZoneThreatLevel, resolveLocalizedText, threatLevelToStatus } from './selectors'

type TerritoryZoneAggregate = {
  stability: number
  insurgency: number
  threatLevel: number
}

function roundedWeightedAverage(values: Array<{ value: number; weight: number }>): number | null {
  if (values.length === 0) return null
  let weightedSum = 0
  let totalWeight = 0
  for (const entry of values) {
    weightedSum += entry.value * entry.weight
    totalWeight += entry.weight
  }
  if (totalWeight <= 0) return null
  return Math.round(weightedSum / totalWeight)
}

function aggregateTerritoryZones(
  territoryKey: TerritoryKey,
  zoneState: Record<string, ZoneState> | undefined
): TerritoryZoneAggregate | null {
  if (!zoneState) return null
  const zones = Object.values(zoneState).filter((zone) => zone.territory_key === territoryKey)
  if (zones.length === 0) return null

  const weightedStability = zones.map((zone) => ({
    value: zone.stability,
    weight: zone.population > 0 ? zone.population : 1,
  }))
  const weightedInsurgency = zones.map((zone) => ({
    value: zone.insurgency,
    weight: zone.population > 0 ? zone.population : 1,
  }))
  const weightedThreat = zones.map((zone) => ({
    value: zone.threat_level,
    weight: zone.population > 0 ? zone.population : 1,
  }))

  const stability = roundedWeightedAverage(weightedStability)
  const insurgency = roundedWeightedAverage(weightedInsurgency)
  const threatLevel = roundedWeightedAverage(weightedThreat)
  if (stability === null || insurgency === null || threatLevel === null) return null

  return { stability, insurgency, threatLevel }
}

function fallbackStatus(stability: number, insurgency: number): TerritoryStatus {
  const derivedThreat = deriveZoneThreatLevel(stability, insurgency)
  return threatLevelToStatus(derivedThreat)
}

function territoryEntryChanged(previous: TerritoryState | undefined, next: TerritoryState): boolean {
  if (!previous) return true
  return (
    previous.name !== next.name ||
    previous.stability !== next.stability ||
    previous.insurgency !== next.insurgency ||
    previous.status !== next.status ||
    previous.population !== next.population ||
    previous.coords.lat !== next.coords.lat ||
    previous.coords.lon !== next.coords.lon ||
    previous.au_presence !== next.au_presence
  )
}

/**
 * Keep per-session territory_state aligned with live zone_state.
 * Territory stability/insurgency/status are derived as population-weighted aggregates from zones.
 */
export function reconcileTerritoryStateFromZones(state: GameState): GameState {
  const content = state.content
  const existing = state.territory_state
  if (!content || !existing || !state.zone_state) {
    return state
  }

  let changed = false
  const nextTerritoryState: Record<TerritoryKey, TerritoryState> = { ...existing }

  for (const territory of content.territories.territories) {
    const territoryKey = territory.territory_key
    const previous = existing[territoryKey]
    const aggregate = aggregateTerritoryZones(territoryKey, state.zone_state)

    const stability = aggregate?.stability ?? previous?.stability ?? territory.base_metrics.stability
    const insurgency = aggregate?.insurgency ?? previous?.insurgency ?? territory.base_metrics.insurgency
    const status = aggregate?.threatLevel !== undefined
      ? threatLevelToStatus(aggregate.threatLevel)
      : previous?.status ?? fallbackStatus(stability, insurgency)

    const nextEntry: TerritoryState = {
      territory_key: territoryKey,
      name: previous?.name ?? resolveLocalizedText(content.localization, territory.name_key),
      stability,
      insurgency,
      status,
      population: territory.population,
      coords: { ...territory.coords },
      au_presence: previous?.au_presence,
    }

    if (territoryEntryChanged(previous, nextEntry)) {
      changed = true
    }
    nextTerritoryState[territoryKey] = nextEntry
  }

  if (!changed) {
    return state
  }

  return {
    ...state,
    territory_state: nextTerritoryState,
  }
}

