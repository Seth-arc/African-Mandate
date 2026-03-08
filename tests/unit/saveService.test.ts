/**
 * Unit tests for persistence/auth save service behavior.
 * Sources:
 * - src/services/saveService.ts
 * - src/state/initState.ts
 * - src/data/game_config.json
 * - src/data/* content packs referenced below
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../src/state/initState'
import {
  deserializeGameState,
  listLocalSessions,
  loadLocalSessionSnapshot,
  requireAuthenticatedUserId,
  saveCloudSessionSnapshot,
  saveLocalSessionSnapshot,
  serializeGameState,
} from '../../src/services/saveService'
import { GameError, type GameConfig, type GameContent, type GameState } from '../../src/state/types'

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

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  key(index: number): string | null {
    const keys = [...this.map.keys()]
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

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

function buildState(): GameState {
  const base = createInitialState(config, buildContent())
  return {
    ...base,
    session: {
      ...base.session,
      turn: 3,
      actions_remaining: 1,
      resources: {
        ...base.session.resources,
        budget: base.session.resources.budget - 1_000_000,
      },
    },
    action_log: [
      {
        turn: 2,
        action_id: 'security_patrol_deployment',
        target: { zone_id: 'mopti' },
        costs: {
          budget: 1_000_000,
          political_capital: 5,
          personnel: 200,
          intel_points: 0,
          time_months: 0,
        },
        metric_deltas: {
          stability: 2,
          insurgency: -3,
        },
        resource_deltas: {
          budget: -1_000_000,
          personnel: -200,
          political_capital: -5,
        },
        flag_additions: ['patrol_active_in_zone'],
      },
    ],
  }
}

describe('saveService', () => {
  const storage = new MemoryStorage()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('serializes and deserializes runtime state without mutating config/content', () => {
    const saved = buildState()
    const baseState = createInitialState(config, buildContent())

    const snapshot = serializeGameState(saved)
    const restored = deserializeGameState(snapshot, baseState)

    expect(restored.session.turn).toBe(3)
    expect(restored.session.actions_remaining).toBe(1)
    expect(restored.action_log?.[0]?.action_id).toBe('security_patrol_deployment')
    expect(restored.config.total_turns).toBe(baseState.config.total_turns)
    expect(restored.content?.actions.actions.length).toBe(baseState.content?.actions.actions.length)
  })

  it('saves, lists, and reloads guest sessions from local storage', () => {
    const state = buildState()
    const summary = saveLocalSessionSnapshot({
      state,
      reason: 'manual',
      mode: 'manual',
    })

    const listed = listLocalSessions()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.session_id).toBe(summary.session_id)
    expect(listed[0]?.turn).toBe(3)

    const baseState = createInitialState(config, buildContent())
    const restored = loadLocalSessionSnapshot(summary.session_id, baseState)
    expect(restored.session.turn).toBe(3)
    expect(restored.session.actions_remaining).toBe(1)
    expect(restored.action_log?.[0]?.target.zone_id).toBe('mopti')
  })

  it('enforces auth guard for cloud session writes', async () => {
    expect(() => requireAuthenticatedUserId(null)).toThrowError(GameError)
    try {
      requireAuthenticatedUserId(undefined)
      expect.fail('expected AUTH_REQUIRED')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GameError)
      expect((error as GameError).code).toBe('AUTH_REQUIRED')
    }

    await expect(
      saveCloudSessionSnapshot({
        state: buildState(),
        reason: 'manual',
        mode: 'manual',
      })
    ).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  })
})

