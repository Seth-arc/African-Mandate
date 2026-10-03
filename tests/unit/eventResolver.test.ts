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
    const eventLog = result.state.action_log?.find((entry) => entry.action_id === 'event:intel_briefing_climate_shock_warning')
    expect(eventLog).toBeDefined()
    expect(eventLog?.resolution_timing).toBe('end_turn')
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
    const eventLog = result.state.action_log?.find((entry) => entry.action_id === 'event:security_unrest_spike')
    expect(eventLog).toBeDefined()
    expect(eventLog?.resolution_timing).toBe('end_turn')
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
    const penaltyLog = result.state.action_log?.find((entry) => entry.action_id === 'event_penalty:external_donor_funding_freeze')
    expect(penaltyLog).toBeDefined()
    expect(penaltyLog?.resolution_timing).toBe('end_turn')
  })

  it('resolves an active crisis before expiry when its authored resolution condition is met', () => {
    const violence = findEvent('security_intercommunal_violence')
    const success = findEvent('security_intercommunal_mediation_success')
    const failure = findEvent('security_intercommunal_mediation_failure')
    const triggered = resolveRuntimeEvents(buildState([violence, success, failure], {
      session: { turn: 1 },
    })).state
    const before = triggered.session.metrics

    const resolved = resolveRuntimeEvents({
      ...triggered,
      session: {
        ...triggered.session,
        turn: 2,
      },
      narrative_flags: {
        ...(triggered.narrative_flags ?? {}),
        mediation_action_success: true,
      },
      narrative_flag_turns: {
        ...(triggered.narrative_flag_turns ?? {}),
        mediation_action_success: 2,
      },
    })

    const result = resolveRuntimeEvents({
      ...resolved.state,
      session: {
        ...resolved.state.session,
        turn: 4,
      },
    })

    const activeEvent = result.state.active_events?.find((event) => event.event_id === violence.event_id)
    expect(activeEvent?.status).toBe('resolved')
    expect(result.deadlineFailReason).toBeUndefined()
    expect(result.state.session.metrics.civilian_support).toBe(before.civilian_support + 6)
    expect(result.state.session.metrics.stability).toBe(before.stability + 4)
    expect(result.state.session.metrics.insurgency).toBe(before.insurgency - 4)
    expect(result.state.event_log?.some((entry) => entry.event_id === success.event_id)).toBe(true)
    expect(result.state.event_log?.some((entry) => entry.event_id === failure.event_id)).toBe(false)
    expect(result.state.event_log?.some(
      (entry) => entry.event_id === violence.event_id && entry.source === 'penalty'
    )).toBe(false)
  })

  it('applies the intercommunal missed-deadline damage exactly once', () => {
    const violence = findEvent('security_intercommunal_violence')
    const success = findEvent('security_intercommunal_mediation_success')
    const failure = findEvent('security_intercommunal_mediation_failure')
    const triggered = resolveRuntimeEvents(buildState([violence, success, failure], {
      session: { turn: 1 },
    })).state
    const before = triggered.session.metrics

    const result = resolveRuntimeEvents({
      ...triggered,
      session: {
        ...triggered.session,
        turn: 4,
      },
    })

    const activeEvent = result.state.active_events?.find((event) => event.event_id === violence.event_id)
    expect(activeEvent?.status).toBe('expired')
    expect(result.state.session.metrics.civilian_support).toBe(before.civilian_support - 8)
    expect(result.state.session.metrics.stability).toBe(before.stability - 6)
    expect(result.state.session.metrics.insurgency).toBe(before.insurgency + 6)
    expect(result.state.event_log?.filter(
      (entry) => entry.event_id === violence.event_id && entry.source === 'penalty'
    )).toHaveLength(1)
    expect(result.state.event_log?.some((entry) => entry.event_id === failure.event_id)).toBe(true)
  })

  it('does not treat a mediation flag set after the crisis deadline as a successful resolution', () => {
    const violence = findEvent('security_intercommunal_violence')
    const success = findEvent('security_intercommunal_mediation_success')
    const failure = findEvent('security_intercommunal_mediation_failure')
    const triggered = resolveRuntimeEvents(buildState([violence, success, failure], {
      session: { turn: 1 },
    })).state

    const result = resolveRuntimeEvents({
      ...triggered,
      session: {
        ...triggered.session,
        turn: 4,
      },
      narrative_flags: {
        ...(triggered.narrative_flags ?? {}),
        mediation_action_success: true,
      },
    })

    const activeEvent = result.state.active_events?.find((event) => event.event_id === violence.event_id)
    expect(activeEvent?.status).toBe('expired')
    expect(result.state.event_log?.some((entry) => entry.event_id === success.event_id)).toBe(false)
    expect(result.state.event_log?.some((entry) => entry.event_id === failure.event_id)).toBe(true)
  })

  it('prevents the procurement leak when civil-society monitoring is active', () => {
    const procurementLeak = findEvent('corruption_procurement_leak')
    const base = buildState([procurementLeak], {
      session: {
        turn: 1,
        resources: { political_capital: 30 },
        metrics: { civilian_support: 35 },
      },
    })

    const exposed = resolveRuntimeEvents(base)
    expect(exposed.state.event_log?.some((entry) => entry.event_id === procurementLeak.event_id)).toBe(true)

    const protectedState = {
      ...base,
      narrative_flags: { anti_corruption_monitoring_active: true },
      narrative_flag_turns: { anti_corruption_monitoring_active: 1 },
    }
    const protectedResult = resolveRuntimeEvents(protectedState)
    expect(protectedResult.state.event_log?.some((entry) => entry.event_id === procurementLeak.event_id)).toBe(false)
  })

  it('resolves an active governance crisis through an authored oversight response', () => {
    const governance = findEvent('governance_crisis')
    const corruptionEvent = findEvent('corruption_procurement_leak')
    const triggered = resolveRuntimeEvents(buildState([governance], {
      session: {
        turn: 1,
        resources: { political_capital: 30 },
      },
      active_events: [{
        event_id: corruptionEvent.event_id,
        event_type: corruptionEvent.event_type,
        category: corruptionEvent.category,
        trigger_turn: 1,
        deadline_turn: 3,
        failure_on_deadline: false,
        status: 'active',
      }],
    })).state

    expect(triggered.active_events?.some(
      (event) => event.event_id === governance.event_id && event.status === 'active'
    )).toBe(true)

    const resolved = resolveRuntimeEvents({
      ...triggered,
      session: {
        ...triggered.session,
        turn: 2,
      },
      narrative_flags: {
        ...(triggered.narrative_flags ?? {}),
        anti_corruption_monitoring_active: true,
      },
      narrative_flag_turns: {
        ...(triggered.narrative_flag_turns ?? {}),
        anti_corruption_monitoring_active: 2,
      },
    }).state

    const afterDeadline = resolveRuntimeEvents({
      ...resolved,
      session: {
        ...resolved.session,
        turn: 4,
      },
    })
    const governanceState = afterDeadline.state.active_events?.find(
      (event) => event.event_id === governance.event_id
    )
    expect(governanceState?.status).toBe('resolved')
    expect(afterDeadline.deadlineFailReason).toBeUndefined()
  })

  it('resolves an active corridor failure when the humanitarian corridor opens before deadline', () => {
    const corridorFailure = findEvent('humanitarian_corridor_failure')
    const state = buildState([corridorFailure], {
      session: { turn: 6 },
      narrative_flags: {
        idp_surge_escalated: true,
        humanitarian_corridor_open: true,
      },
      active_events: [{
        event_id: corridorFailure.event_id,
        event_type: corridorFailure.event_type,
        category: corridorFailure.category,
        trigger_turn: 5,
        deadline_turn: 7,
        failure_on_deadline: true,
        status: 'active',
      }],
    })

    const resolved = resolveRuntimeEvents(state)
    const afterDeadline = resolveRuntimeEvents({
      ...resolved.state,
      session: {
        ...resolved.state.session,
        turn: 8,
      },
    })
    const corridorState = afterDeadline.state.active_events?.find(
      (event) => event.event_id === corridorFailure.event_id
    )
    expect(corridorState?.status).toBe('resolved')
    expect(afterDeadline.deadlineFailReason).toBeUndefined()
  })
})
