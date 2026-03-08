/**
 * Unit tests for runtime event plumbing.
 * Sources:
 * - src/data/events.yaml
 * - src/data/intel_reports.json
 * - src/systems/eventResolver.ts
 */
import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../src/state/initState'
import { resolveRuntimeEvents } from '../../src/systems/eventResolver'
import type { EventData, GameConfig, GameContent, GameState } from '../../src/state/types'

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
const parsedEvents = parseEventsYaml(eventsYamlRaw).events

function findEvent(eventId: string): EventData {
  const event = parsedEvents.find((entry) => entry.event_id === eventId)
  if (!event) {
    throw new Error(`Missing event fixture ${eventId}`)
  }
  return event
}

function buildContent(events: EventData[]): GameContent {
  return {
    territories: territoriesJson as GameContent['territories'],
    zones: zonesJson as GameContent['zones'],
    zone_runtime_seed: zoneRuntimeSeedJson as GameContent['zone_runtime_seed'],
    actors: actorsJson as GameContent['actors'],
    intel_reports: intelReportsJson as GameContent['intel_reports'],
    actions: actionsJson as GameContent['actions'],
    dialogues: dialoguesJson as GameContent['dialogues'],
    events: { events },
    cutscenes: cutscenesJson as GameContent['cutscenes'],
    localization: localizationJson as GameContent['localization'],
  }
}

function buildState(events: EventData[], overrides?: Partial<GameState>): GameState {
  const base = createInitialState(config, buildContent(events))
  if (!overrides) return base
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

describe('eventResolver', () => {
  it('refreshes intel feed items when an intel event triggers', () => {
    const climateEvent = findEvent('intel_briefing_climate_shock_warning')
    const state = buildState([climateEvent], {
      session: { turn: 8 },
    })

    const result = resolveRuntimeEvents(state)
    const feedItem = result.state.intel_feed?.find((item) => item.report_key === 'intel_climate_drought_warning')

    expect(result.state.narrative_flags?.intel_briefing_climate_shock_warning).toBe(true)
    expect(feedItem?.occurred_at).toBe(8)
    expect(feedItem?.is_read).toBe(false)
    expect(result.state.action_log?.some((entry) => entry.action_id === 'event:intel_briefing_climate_shock_warning')).toBe(true)
  })

  it('applies crisis metric effects from events.yaml outcomes', () => {
    const unrest = findEvent('security_unrest_spike')
    const state = buildState([unrest], {
      session: {
        turn: 3,
        metrics: {
          stability: 60,
          insurgency: 40,
          civilian_support: 40,
          global_legitimacy: 55,
          regional_synergy: 50,
        },
      },
    })

    const result = resolveRuntimeEvents(state)
    expect(result.state.session.metrics.civilian_support).toBe(37)
    expect(result.state.session.metrics.stability).toBe(58)
    expect(result.state.session.metrics.global_legitimacy).toBe(53)
    expect(result.state.action_log?.some((entry) => entry.action_id === 'event:security_unrest_spike')).toBe(true)
  })

  it('applies deadline penalties and returns fail reason for failure_on_deadline events', () => {
    const donorFreeze = findEvent('external_donor_funding_freeze')
    const state = buildState([donorFreeze], {
      session: { turn: 20 },
      active_events: [{
        event_id: donorFreeze.event_id,
        event_type: donorFreeze.event_type,
        category: donorFreeze.category,
        trigger_turn: 19,
        deadline_turn: 19,
        failure_on_deadline: true,
        status: 'active',
      }],
    })

    const result = resolveRuntimeEvents(state)
    const activeEvent = result.state.active_events?.[0]

    expect(result.deadlineFailReason).toBe('failure_on_deadline:external_donor_funding_freeze')
    expect(activeEvent?.status).toBe('expired')
    expect(result.state.action_log?.some((entry) => entry.action_id === 'event_penalty:external_donor_funding_freeze')).toBe(true)
  })
})
