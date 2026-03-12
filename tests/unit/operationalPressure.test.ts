/**
 * Unit tests for operational pressure derivation.
 * Sources:
 * - src/ui/operationalPressure.ts
 * - src/data/intel_reports.json
 */
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../src/state/initState'
import { deriveOperationalPressure } from '../../src/ui/operationalPressure'
import type { GameConfig, GameContent, GameState, ZoneState } from '../../src/state/types'

import gameConfigJson from '../../src/data/game_config.json'
import territoriesJson from '../../src/data/territories.json'
import zonesJson from '../../src/data/zones.json'
import zoneRuntimeSeedJson from '../../src/data/zone_runtime_seed.json'
import actorsJson from '../../src/data/actors.json'
import intelReportsJson from '../../src/data/intel_reports.json'
import actionsJson from '../../src/data/actions.json'
import dialoguesJson from '../../src/data/dialogues.json'
import cutscenesJson from '../../src/data/cutscenes.json'
import localizationJson from '../../src/data/localization_en.json'
import eventsYamlRaw from '../../src/data/events.yaml?raw'
import { parseEventsYaml } from '../../src/data/eventsLoader'

const config = gameConfigJson.game_config as GameConfig

function buildContent(): GameContent {
  return {
    territories: territoriesJson as GameContent['territories'],
    zones: zonesJson as GameContent['zones'],
    zone_runtime_seed: zoneRuntimeSeedJson as GameContent['zone_runtime_seed'],
    actors: actorsJson as GameContent['actors'],
    intel_reports: intelReportsJson as GameContent['intel_reports'],
    actions: actionsJson as GameContent['actions'],
    dialogues: dialoguesJson as GameContent['dialogues'],
    events: parseEventsYaml(eventsYamlRaw),
    cutscenes: cutscenesJson as GameContent['cutscenes'],
    localization: localizationJson as GameContent['localization'],
  }
}

function flattenThreatLevels(zoneState: Record<string, ZoneState> | undefined, threatLevel: number): Record<string, ZoneState> {
  const next: Record<string, ZoneState> = {}
  for (const zone of Object.values(zoneState ?? {})) {
    next[zone.zone_id] = {
      ...zone,
      threat_level: threatLevel,
    }
  }
  return next
}

function buildState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState(config, buildContent())
  const next: GameState = {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...(overrides?.session ?? {}),
      resources: {
        ...base.session.resources,
        ...(overrides?.session?.resources ?? {}),
      },
      metrics: {
        ...base.session.metrics,
        ...(overrides?.session?.metrics ?? {}),
      },
      ai_state: {
        ...base.session.ai_state,
        ...(overrides?.session?.ai_state ?? {}),
      },
    },
  }
  return next
}

describe('operationalPressure', () => {
  it('raises pressure from scoped urgent intel even without runtime critical zones', () => {
    const baselineState = buildState({
      session: { turn: 4 },
      intel_feed: [],
    })
    const flattenedBaseline: GameState = {
      ...baselineState,
      zone_state: flattenThreatLevels(baselineState.zone_state, 20),
    }

    const baseline = deriveOperationalPressure(flattenedBaseline)
    const withIntel = deriveOperationalPressure({
      ...flattenedBaseline,
      intel_feed: [{
        report_key: 'intel_threat_assessment_mopti',
        occurred_at: 4,
        is_read: false,
        is_urgent: true,
      }],
    })

    expect(baseline.runtimeCriticalZoneCount).toBe(0)
    expect(withIntel.runtimeCriticalZoneCount).toBe(0)
    expect(withIntel.intelCriticalZoneAdditions).toBe(1)
    expect(withIntel.criticalZoneCount).toBe(1)
    expect(withIntel.activeUrgentIntelCount).toBe(1)
    expect(withIntel.score).toBeGreaterThan(baseline.score)
  })

  it('ignores expired intel updates when deriving pressure', () => {
    const state = buildState({
      session: { turn: 8 },
      intel_feed: [{
        report_key: 'intel_threat_assessment_mopti',
        occurred_at: 1,
        is_read: false,
        is_urgent: true,
      }],
    })
    const flattenedState: GameState = {
      ...state,
      zone_state: flattenThreatLevels(state.zone_state, 20),
    }

    const pressure = deriveOperationalPressure(flattenedState)
    expect(pressure.runtimeCriticalZoneCount).toBe(0)
    expect(pressure.intelCriticalZoneAdditions).toBe(0)
    expect(pressure.criticalZoneCount).toBe(0)
    expect(pressure.activeUrgentIntelCount).toBe(0)
  })
})

