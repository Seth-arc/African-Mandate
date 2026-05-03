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
import {
  assertSupportedActionCondition,
  evaluateActionCondition,
} from '../../src/systems/actionConditionEvaluator'
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

    it('uses resources.intel_points for action.intel_gate instead of intel_confidence', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'security_targeted_operation'
      ) as ActionDefinition
      const cost = getResolvedCost(action)
      const locked = makeState({
        resources: {
          ...config.starting_resources,
          intel_points: 19,
        },
        ai_state: {
          ...config.starting_ai_state,
          intel_confidence: 100,
        },
      })

      try {
        validateAction(locked, action, { zone_id: 'mopti' }, cost)
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(GameError)
        expect((e as GameError).code).toBe('INTEL_GATE')
        expect((e as GameError).message).toContain('intel_points')
      }

      const unlocked = makeState({
        resources: {
          ...config.starting_resources,
          intel_points: 20,
        },
        ai_state: {
          ...config.starting_ai_state,
          intel_confidence: 0,
        },
      })
      expect(() => validateAction(unlocked, action, { zone_id: 'mopti' }, cost)).not.toThrow()
    })

    it('enforces supported requirements.condition expressions', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'negotiation_splinter_faction'
      ) as ActionDefinition
      const cost = getResolvedCost(action)
      const target = { actor_key: 'insurgent_splinter' }
      const base = makeState({
        resources: {
          ...config.starting_resources,
          intel_points: 20,
        },
      })
      const blocked = {
        ...base,
        session: {
          ...base.session,
          metrics: {
            ...base.session.metrics,
            insurgency: 50,
          },
        },
        narrative_flags: {
          splinter_dialogue_open: true,
        },
      }

      try {
        validateAction(blocked, action, target, cost)
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(GameError)
        expect((e as GameError).code).toBe('REQUIREMENT_CONDITION')
      }

      const allowed = {
        ...blocked,
        session: {
          ...blocked.session,
          metrics: {
            ...blocked.session.metrics,
            insurgency: 49,
          },
        },
      }
      expect(() => validateAction(allowed, action, target, cost)).not.toThrow()
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

    it('sets authored corruption-risk flags only when the safe condition is true', () => {
      const action = actionsJson.actions.find(
        (a: { action_id: string }) => a.action_id === 'humanitarian_aid_distribution'
      ) as ActionDefinition
      const state = makeState()
      const result = executeActionWithLog(state, action, { zone_id: 'mopti' })

      expect(result.state.narrative_flags?.humanitarian_aid_spend_high).toBe(true)
      expect(result.logEntry.flag_additions).toContain('humanitarian_aid_spend_high')

      const guarded = {
        ...state,
        oversight_level: {
          level: 'strong' as const,
          set_on_turn: 1,
        },
      }
      const guardedResult = executeActionWithLog(guarded, action, { zone_id: 'mopti' })
      expect(guardedResult.state.narrative_flags?.humanitarian_aid_spend_high).toBeUndefined()
      expect(guardedResult.logEntry.flag_additions).not.toContain('humanitarian_aid_spend_high')
    })

    it('resolves civilian harm risks deterministically, applies deltas, and logs media-event linkage', () => {
      const action: ActionDefinition = {
        ...(actionsJson.actions[0] as ActionDefinition),
        action_id: 'test_civilian_harm_risk',
        cooldown_turns: 0,
        effects: {
          metrics: {
            stability: 1,
          },
          flags: ['base_effect_applied'],
          risks: {
            civilian_harm_chance: 1,
            civilian_harm_effects: {
              civilian_support: -7,
              global_legitimacy: -4,
            },
          },
        },
      }
      const state = makeState()
      const result = executeActionWithLog(state, action, { zone_id: 'mopti' })

      expect(result.state.session.metrics.stability).toBe(state.session.metrics.stability + 1)
      expect(result.state.session.metrics.civilian_support).toBe(state.session.metrics.civilian_support - 7)
      expect(result.state.session.metrics.global_legitimacy).toBe(state.session.metrics.global_legitimacy - 4)
      expect(result.state.narrative_flags?.civilian_harm_incident).toBe(true)
      expect(result.logEntry.flag_additions).toEqual(
        expect.arrayContaining(['base_effect_applied', 'civilian_harm_incident'])
      )
      expect(result.logEntry.risk_outcomes?.[0]).toMatchObject({
        type: 'civilian_harm',
        applied: true,
        threshold: 1,
        metric_deltas: {
          civilian_support: -7,
          global_legitimacy: -4,
        },
        flag_additions: ['civilian_harm_incident'],
        media_event_key: 'media_civilian_harm_report',
      })
      expect(result.logEntry.metric_deltas).toMatchObject({
        stability: 1,
        civilian_support: -7,
        global_legitimacy: -4,
      })
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
      expect(result.logEntry.resolution_timing).toBe('immediate_action')
      expect(result.logEntry.costs.budget).toBe(1_000_000)
      expect(result.logEntry.metric_deltas.stability).toBe(2)
      expect(result.logEntry.metric_deltas.insurgency).toBe(-3)
      expect(result.logEntry.resource_deltas.budget).toBe(-1_000_000)
      expect(result.logEntry.flag_additions).toContain('patrol_active_in_zone')
    })
  })

  describe('action condition evaluator', () => {
    it('evaluates documented requirements and corruption-risk condition examples', () => {
      const state = makeState({
        metrics: {
          ...config.starting_metrics,
          insurgency: 49,
        },
      })

      expect(evaluateActionCondition(state, 'insurgency < 50')).toBe(true)
      expect(evaluateActionCondition(state, "oversight_level.level == 'none'")).toBe(true)
      expect(
        evaluateActionCondition(
          { ...state, narrative_flags: { splinter_dialogue_open: true } },
          'flags.splinter_dialogue_open == true'
        )
      ).toBe(true)
    })

    it('rejects unsupported authored action conditions before runtime use', () => {
      expect(() =>
        assertSupportedActionCondition('insurgency approximately 50', 'test unsupported condition')
      ).toThrow(/Unsupported action condition/)
      expect(() =>
        assertSupportedActionCondition('unknown_flag == true', 'test unsupported path')
      ).toThrow(/Unsupported action condition path/)
    })
  })
})
