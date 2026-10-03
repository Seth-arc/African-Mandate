/**
 * Unit tests for events.yaml parsing.
 * Source:
 * - src/data/events.yaml
 */
import { describe, expect, it } from 'vitest'
import eventsYamlRaw from '../../src/data/events.yaml?raw'
import { parseEventsYaml } from '../../src/data/eventsLoader'

describe('eventsLoader', () => {
  it('parses canonical events list from events.yaml', () => {
    const parsed = parseEventsYaml(eventsYamlRaw)

    expect(parsed.events.length).toBeGreaterThan(0)
    expect(parsed.events.some((event) => event.event_id === 'security_insurgent_counter_tactics')).toBe(true)
  })

  it('preserves folded trigger condition lines as one scalar', () => {
    const parsed = parseEventsYaml(eventsYamlRaw)
    const intercommunal = parsed.events.find((event) => event.event_id === 'security_intercommunal_violence')

    expect(intercommunal).toBeDefined()
    expect(intercommunal?.trigger_conditions).toContain('zone.multi_ethnic == true')
    expect(intercommunal?.trigger_conditions).toContain('zone.insurgency > 60')
  })

  it('loads authored crisis resolution conditions', () => {
    const parsed = parseEventsYaml(eventsYamlRaw)
    const intercommunal = parsed.events.find((event) => event.event_id === 'security_intercommunal_violence')
    const governance = parsed.events.find((event) => event.event_id === 'governance_crisis')
    const corridorFailure = parsed.events.find((event) => event.event_id === 'humanitarian_corridor_failure')

    expect(intercommunal?.resolution_conditions).toBe('mediation_action_success == true')
    expect(governance?.resolution_conditions).toContain('anti_corruption_monitoring_active == true')
    expect(governance?.resolution_conditions).toContain('audit_status.status == pending')
    expect(corridorFailure?.resolution_conditions).toContain('humanitarian_corridor_open == true')
  })
})
