/**
 * Unit tests for startup hydration and selector resolution.
 * Sources:
 * - src/data/territories.json
 * - src/data/zones.json
 * - src/data/zone_runtime_seed.json
 * - src/data/actors.json
 * - src/data/intel_reports.json
 * - src/data/localization_en.json
 * - game/dev_docs/FULL_GAME_LEVEL_DESIGN.md
 * - game/dev_docs/RUNTIME_DATA_REQUIREMENTS.md
 */
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../src/state/initState'
import { resolveActorName, resolveIntelReport } from '../../src/state/selectors'
import type { GameConfig, GameContent } from '../../src/state/types'

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
const content: GameContent = {
  territories: territoriesJson,
  zones: zonesJson,
  zone_runtime_seed: zoneRuntimeSeedJson,
  actors: actorsJson,
  intel_reports: intelReportsJson,
  actions: actionsJson,
  dialogues: dialoguesJson,
  events: parseEventsYaml(eventsYamlRaw),
  cutscenes: cutscenesJson,
  localization: localizationJson,
}

describe('createInitialState', () => {
  it('hydrates canonical content packs into state.content from src/data', () => {
    const state = createInitialState(config, content)

    expect(state.content?.territories.territories).toHaveLength(5)
    expect(state.content?.zones.zones).toHaveLength(15)
    expect(state.content?.intel_reports.intel_reports).toHaveLength(10)
    expect((state.content?.events.events.length ?? 0)).toBeGreaterThan(0)
    expect(state.action_log).toEqual([])
  })

  it('seeds zone_state threat_level from zones.json using the FULL_GAME_LEVEL_DESIGN formula', () => {
    const state = createInitialState(config, content)
    const mopti = state.zone_state?.mopti

    expect(mopti).toBeDefined()
    expect(mopti?.stability).toBe(32)
    expect(mopti?.insurgency).toBe(72)
    expect(mopti?.civilian_support).toBe(35)
    expect(mopti?.threat_level).toBe(70)
  })

  it('hydrates authored runtime zone details from zone_runtime_seed.json and preserves defaults for omitted seed fields', () => {
    const state = createInitialState(config, content)
    const mopti = state.zone_state?.mopti
    const burkinaNorth = state.zone_state?.burkina_north
    const bamako = state.zone_state?.bamako
    const niamey = state.zone_state?.niamey

    expect(mopti?.displaced).toBe(55_000)
    expect(mopti?.incidents).toContain('Mopti Market Bombing (2024)')
    expect(mopti?.actors_present).toContain('JNIM')

    expect(burkinaNorth?.displaced).toBe(30_000)
    expect(burkinaNorth?.incidents).toContain('Aid Blockade in Dori')
    expect(burkinaNorth?.actors_present).toContain('Wagner Group')

    expect(niamey?.threats).toContain(
      'Counterterrorism surveillance and rapid-response gaps after French withdrawal'
    )
    expect(niamey?.incidents).toContain('French Military Withdrawal')
    expect(niamey?.displaced).toBe(0)

    expect(bamako?.displaced).toBe(0)
    expect(bamako?.incidents).toEqual([])
    expect(bamako?.actors_present).toContain('Wagner Group')
  })

  it('seeds tracked actor sentiments from actors.json default relationship scores and labels', () => {
    const state = createInitialState(config, content)
    const ecowas = state.actor_sentiments?.regional_ecowas

    expect(ecowas).toBeDefined()
    expect(ecowas?.relationship_score).toBe(50)
    expect(ecowas?.relationship_label).toBe('neutral')
    expect(ecowas?.stance).toBe('neutral')
    expect(ecowas?.dialogue_state).toBe('available')
    expect(state.actor_sentiments?.insurgent_networks).toBeUndefined()
  })

  it('seeds intel_feed items from intel_reports.json with urgent status derived from report urgency', () => {
    const state = createInitialState(config, content)
    const urgentReport = state.intel_feed?.find((item) => item.report_key === 'intel_insurgent_movement')
    const mediumReport = state.intel_feed?.find((item) => item.report_key === 'intel_climate_drought_warning')

    expect(state.intel_feed).toHaveLength(10)
    expect(urgentReport?.is_urgent).toBe(true)
    expect(urgentReport?.occurred_at).toBe(1)
    expect(mediumReport?.is_urgent).toBe(false)
  })
})

describe('state selectors', () => {
  it('resolves actor and intel localization keys from localization_en.json', () => {
    expect(resolveActorName(content, 'regional_ecowas')).toContain('ECOWAS')

    const report = resolveIntelReport(content, 'intel_threat_assessment_mopti')
    expect(report?.headline_text).toBe('Threat Assessment: Mopti')
    expect(report?.body_text).toContain('insurgent activity intensifying around Mopti')
  })
})
