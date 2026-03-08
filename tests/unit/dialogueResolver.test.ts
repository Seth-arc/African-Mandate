/**
 * Unit tests for dialogue resolution and consequence application.
 * Sources:
 * - src/data/dialogues.json
 * - src/data/game_config.json
 * - src/systems/dialogueResolver.ts
 */
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../src/state/initState'
import { executeDialogueChoice, getActorDialogueAvailability } from '../../src/systems/dialogueResolver'
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

function makeState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState(config, buildContent())
  if (!overrides) {
    return base
  }
  return {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...(overrides.session ?? {}),
      resources: {
        ...base.session.resources,
        ...(overrides.session?.resources ?? {}),
      },
      metrics: {
        ...base.session.metrics,
        ...(overrides.session?.metrics ?? {}),
      },
      ai_state: {
        ...base.session.ai_state,
        ...(overrides.session?.ai_state ?? {}),
      },
    },
  }
}

describe('dialogueResolver', () => {
  it('reports dialogue as unavailable until trigger condition is satisfied', () => {
    const baseState = makeState({
      session: { turn: 5 },
      narrative_flags: {},
    })
    const before = getActorDialogueAvailability(baseState, 'junta_burkina_traore')
    expect(before).not.toBeNull()
    expect(before?.isAvailable).toBe(false)

    const triggeredState = makeState({
      session: { turn: 5 },
      narrative_flags: { junta_dialogue_initiated: true },
    })
    const after = getActorDialogueAvailability(triggeredState, 'junta_burkina_traore')
    expect(after).not.toBeNull()
    expect(after?.isAvailable).toBe(true)
  })

  it('applies dialogue choice costs/effects, updates relationship, and appends structured log entry', () => {
    const state = makeState({
      session: { turn: 5 },
      narrative_flags: { junta_dialogue_initiated: true },
    })

    const result = executeDialogueChoice(state, 'dialogue_junta_negotiation', 'conditional_support')

    expect(result.state.session.resources.political_capital).toBe(state.session.resources.political_capital - 5)
    expect(result.state.session.metrics.global_legitimacy).toBe(state.session.metrics.global_legitimacy + 5)
    expect(result.state.actor_sentiments?.junta_burkina_traore?.relationship_score).toBe(56)
    expect(result.state.narrative_flags?.anti_corruption_monitoring_active).toBe(true)

    const latestLog = result.state.action_log?.[result.state.action_log.length - 1]
    expect(latestLog).toBeDefined()
    expect(latestLog?.action_id).toBe('dialogue:dialogue_junta_negotiation:conditional_support')
    expect(latestLog?.target.actor_key).toBe('junta_burkina_traore')
    expect(latestLog?.metric_deltas.global_legitimacy).toBe(5)
    expect(latestLog?.resource_deltas.political_capital).toBe(-5)
  })

  it('throws INSUFFICIENT_BUDGET when dialogue choice cost exceeds available budget', () => {
    const state = makeState({
      session: {
        turn: 5,
        resources: {
          budget: 0,
        },
      },
      narrative_flags: { civil_society_partnership_active: true },
    })

    try {
      executeDialogueChoice(state, 'dialogue_civil_society_partnership', 'full_partnership')
      expect.fail('expected INSUFFICIENT_BUDGET error')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GameError)
      expect((error as GameError).code).toBe('INSUFFICIENT_BUDGET')
    }
  })
})
