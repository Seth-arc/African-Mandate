/**
 * Unit tests for intel feed runtime helpers.
 * Sources:
 * - src/data/intel_reports.json
 * - src/systems/intelResolver.ts
 */
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../src/state/initState'
import { markIntelReportRead } from '../../src/systems/intelResolver'
import { GameError, type GameConfig, type GameContent } from '../../src/state/types'

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

describe('intelResolver', () => {
  it('marks selected intel report as read in runtime feed', () => {
    const state = createInitialState(config, buildContent())
    const unread = state.intel_feed?.find((item) => item.is_read === false)
    expect(unread).toBeDefined()
    const reportKey = unread?.report_key ?? ''

    const next = markIntelReportRead(state, reportKey)
    const marked = next.intel_feed?.find((item) => item.report_key === reportKey)
    expect(marked?.is_read).toBe(true)
  })

  it('throws INTEL_REPORT_NOT_FOUND for unknown report key', () => {
    const state = createInitialState(config, buildContent())
    try {
      markIntelReportRead(state, 'missing_report_key')
      expect.fail('expected INTEL_REPORT_NOT_FOUND')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(GameError)
      expect((error as GameError).code).toBe('INTEL_REPORT_NOT_FOUND')
    }
  })
})
