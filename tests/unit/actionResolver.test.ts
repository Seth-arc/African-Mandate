/**
 * Unit tests for action resolution. Values from src/data/actions.json and game_config.json.
 * No mocking the engine; tests assert specific data-file values and rules (REQUIRED_KEYS, BUILD_STEPS).
 */
import { describe, it, expect } from 'vitest'
import {
  getResolvedCost,
  validateAction,
  applyAction,
  executeActionWithLog,
} from '../../src/systems/actionResolver'
import { createInitialState } from '../../src/state/initState'
import type { GameState, GameConfig, ActionDefinition } from '../../src/state/types'
import { GameError } from '../../src/state/types'

import gameConfigJson from '../../src/data/game_config.json'
import actionsJson from '../../src/data/actions.json'

const config = gameConfigJson.game_config as GameConfig

function makeState(overrides?: Partial<GameState['session']>): GameState {
  const state = createInitialState(config)
  if (overrides) {
    return {
      ...state,
      session: { ...state.session, ...overrides },
    }
  }
  return state
}

describe('actionResolver', () => {
  describe('getResolvedCost', () => {
    it('uses default costs from actions.json for security_patrol_deployment', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_patrol_deployment'
      ) as ActionDefinition
      expect(action).toBeDefined()
      const cost = getResolvedCost(action)
      expect(cost.budget).toBe(1_000_000)
      expect(cost.personnel).toBe(200)
      expect(cost.political_capital).toBe(5)
      expect(cost.intel_points).toBe(0)
      expect(cost.time_months).toBe(0)
    })

    it('uses default costs from actions.json for security_border_reinforcement', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_border_reinforcement'
      ) as ActionDefinition
      expect(action).toBeDefined()
      const cost = getResolvedCost(action)
      expect(cost.budget).toBe(2_500_000)
      expect(cost.time_months).toBe(1)
    })

    it('clamps allocation to min/max and snaps to step (from actions.json cost schema)', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_patrol_deployment'
      ) as ActionDefinition
      const cost = getResolvedCost(action, { budget: 750_000 })
      expect(cost.budget).toBe(750_000)
      const costOverMax = getResolvedCost(action, { budget: 5_000_000 })
      expect(costOverMax.budget).toBe(2_000_000)
    })
  })

  describe('validateAction', () => {
    it('throws NO_ACTIONS_REMAINING when actions_remaining is 0', () => {
      const action = actionsJson.actions[0] as ActionDefinition
      const state = makeState({ actions_remaining: 0 })
      const cost = getResolvedCost(action)
      try {
        validateAction(state, action, { zone_id: 'mopti' }, cost)
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(GameError)
        expect((e as GameError).code).toBe('NO_ACTIONS_REMAINING')
      }
    })

    it('throws INSUFFICIENT_BUDGET when resources below cost (game_config starting_resources)', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_border_reinforcement'
      ) as ActionDefinition
      const state = makeState({
        resources: {
          ...config.starting_resources,
          budget: 1_000_000,
        },
      })
      const cost = getResolvedCost(action)
      try {
        validateAction(state, action, { territory_key: 'mali' }, cost)
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(GameError)
        expect((e as GameError).code).toBe('INSUFFICIENT_BUDGET')
      }
    })

    it('throws INVALID_TARGET for zone action without zone_id', () => {
      const action = actionsJson.actions[0] as ActionDefinition
      const state = makeState()
      const cost = getResolvedCost(action)
      try {
        validateAction(state, action, {}, cost)
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(GameError)
        expect((e as GameError).code).toBe('INVALID_TARGET')
      }
    })
  })

  describe('applyAction', () => {
    it('pays costs and applies metric effects from actions.json (security_patrol_deployment)', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_patrol_deployment'
      ) as ActionDefinition
      const state = makeState()
      const next = applyAction(state, action, { zone_id: 'mopti' })

      expect(next.session.resources.budget).toBe(state.session.resources.budget - 1_000_000)
      expect(next.session.resources.personnel).toBe(state.session.resources.personnel - 200)
      expect(next.session.resources.political_capital).toBe(state.session.resources.political_capital - 5)
      expect(next.session.metrics.stability).toBe(state.session.metrics.stability + 2)
      expect(next.session.metrics.insurgency).toBe(state.session.metrics.insurgency - 3)
      expect(next.session.actions_remaining).toBe(state.session.actions_remaining - 1)
      expect(next.narrative_flags?.['patrol_active_in_zone']).toBe(true)
    })

    it('records action_last_used_turn for cooldown (action cooldown_turns from data)', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_patrol_deployment'
      ) as ActionDefinition
      const state = makeState()
      const next = applyAction(state, action, { zone_id: 'mopti' })
      expect(next.session.action_last_used_turn?.['security_patrol_deployment']).toBe(1)
    })

    it('clamps metrics to 0-100 (REQUIRED_KEYS_AND_CONSTRAINTS)', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_patrol_deployment'
      ) as ActionDefinition
      const state = makeState({
        metrics: { stability: 99, insurgency: 1, civilian_support: 50, global_legitimacy: 50, regional_synergy: 50 },
      })
      const next = applyAction(state, action, { zone_id: 'mopti' })
      expect(next.session.metrics.stability).toBe(100)
      expect(next.session.metrics.insurgency).toBe(0)
    })

    it('applies resource effects and queues delayed resource effects from actions.json', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'intelligence_network_cultivation'
      ) as ActionDefinition
      const state = makeState()
      const next = applyAction(state, action, { zone_id: 'mopti' })

      expect(next.session.resources.intel_points).toBe(state.session.resources.intel_points + 15)
      expect(next.delayed_effects).toBeDefined()
      expect(next.delayed_effects?.[0]?.turn_due).toBe(2)
      expect(next.delayed_effects?.[0]?.resources?.intel_points).toBe(10)
    })
  })

  describe('executeActionWithLog', () => {
    it('appends a structured action log entry with costs and deltas', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_patrol_deployment'
      ) as ActionDefinition
      const state = makeState()
      const result = executeActionWithLog(state, action, { zone_id: 'mopti' })

      expect(result.state.action_log).toBeDefined()
      expect(result.state.action_log).toHaveLength(1)
      expect(result.logEntry.action_id).toBe('security_patrol_deployment')
      expect(result.logEntry.target.zone_id).toBe('mopti')
      expect(result.logEntry.costs.budget).toBe(1_000_000)
      expect(result.logEntry.metric_deltas.stability).toBe(2)
      expect(result.logEntry.metric_deltas.insurgency).toBe(-3)
      expect(result.logEntry.resource_deltas.budget).toBe(-1_000_000)
      expect(result.logEntry.flag_additions).toContain('patrol_active_in_zone')
    })
  })
})
