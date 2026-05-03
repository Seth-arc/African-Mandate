/**
 * Unit tests for turn advancement. Values from game_config.json and WIN_LOSS_SCORING_SPEC test cases.
 * No mocking the engine; tests assert specific rules and data-file values.
 */
import { describe, it, expect } from 'vitest'
import {
  advanceTurn,
  getActFromTurn,
  evaluateEnding,
  applyAiDirector,
  detectRepeatedActionCategoryUse,
  checkEarlyFail,
  isActTransition,
  describeFailReason,
  describeEndingOutcome,
} from '../../src/systems/turnEngine'
import { createInitialState } from '../../src/state/initState'
import type { GameState, GameConfig, GameContent, Metrics } from '../../src/state/types'

import gameConfigJson from '../../src/data/game_config.json'
import actionsJson from '../../src/data/actions.json'

const config = gameConfigJson.game_config as GameConfig

function makeState(overrides?: Partial<GameState['session']> & { metric_history?: GameState['metric_history']; metric_snapshot_turn_19?: GameState['metric_snapshot_turn_19']; zone_threat_snapshot_turn_19?: GameState['zone_threat_snapshot_turn_19']; zone_state?: GameState['zone_state']; action_log?: GameState['action_log']; content?: GameState['content'] }): GameState {
  const state = createInitialState(config)
  const sessionKeys: (keyof GameState['session'])[] = [
    'turn', 'actions_remaining', 'max_turns', 'resources', 'metrics', 'ai_state', 'action_last_used_turn',
  ]
  const sessionOverrides: Partial<GameState['session']> = {}
  if (overrides) {
    for (const k of sessionKeys) {
      if (k in overrides && overrides[k] !== undefined) {
        sessionOverrides[k] = overrides[k] as GameState['session'][typeof k]
      }
    }
  }
  const session = { ...state.session, ...sessionOverrides }
  return {
    ...state,
    session,
    config: { ...state.config, turn_duration_months: config.turn_duration_months ?? [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1] },
    metric_history: overrides?.metric_history,
    metric_snapshot_turn_19: overrides?.metric_snapshot_turn_19,
    zone_threat_snapshot_turn_19: overrides?.zone_threat_snapshot_turn_19,
    zone_state: overrides?.zone_state,
    action_log: overrides?.action_log ?? state.action_log,
    content: overrides?.content ?? state.content,
  }
}

describe('turnEngine', () => {
  describe('getActFromTurn', () => {
    it('derives act from turn per REQUIRED_KEYS: act = floor((turn-1)/4)+1', () => {
      expect(getActFromTurn(1)).toBe(1)
      expect(getActFromTurn(4)).toBe(1)
      expect(getActFromTurn(5)).toBe(2)
      expect(getActFromTurn(8)).toBe(2)
      expect(getActFromTurn(20)).toBe(5)
    })

    it('flags act transitions only when crossing act boundaries', () => {
      expect(isActTransition(4, 5)).toBe(true)
      expect(isActTransition(8, 9)).toBe(true)
      expect(isActTransition(5, 6)).toBe(false)
    })
  })

  describe('ending rationale helpers', () => {
    it('maps fail reasons to readable rationale strings', () => {
      expect(describeFailReason('time_expiry')).toContain('time budget')
      expect(describeFailReason('critical_streak_stability')).toContain('Stability')
    })

    it('describes each ending type for presentation surfaces', () => {
      expect(describeEndingOutcome('strategic_success')).toContain('thresholds')
      expect(describeEndingOutcome('mandate_revoked', 'time_expiry')).toContain('time budget')
    })
  })

  describe('advanceTurn', () => {
    it('resets actions_remaining to action_slots_per_turn from game_config (3)', () => {
      const state = makeState({ actions_remaining: 0 })
      const next = advanceTurn(state)
      expect(next.session.actions_remaining).toBe(config.action_slots_per_turn)
      expect(next.session.turn).toBe(2)
    })

    it('increments turn up to total_turns (game_config: 20)', () => {
      const state = makeState({ turn: 1 })
      const next = advanceTurn(state)
      expect(next.session.turn).toBe(2)
      const at19 = makeState({ turn: 19 })
      const next19 = advanceTurn(at19)
      expect(next19.session.turn).toBe(20)
    })

    it('consumes time_months by turn_duration_months from game_config', () => {
      const state = makeState({ turn: 1, resources: { ...config.starting_resources, time_months: 48 } })
      const next = advanceTurn(state)
      expect(next.session.resources.time_months).toBe(48 - 2)
    })

    it('applies delayed resource effects when turn_due is reached', () => {
      const state = makeState({
        turn: 1,
        resources: { ...config.starting_resources, intel_points: 10, time_months: 48 },
      })
      const withDelayed: GameState = {
        ...state,
        delayed_effects: [{ turn_due: 2, resources: { intel_points: 10 } }],
      }
      const next = advanceTurn(withDelayed)
      expect(next.session.resources.intel_points).toBe(20)
      expect(next.delayed_effects).toEqual([])
    })

    it('sets ending_type mandate_revoked and fail_reason time_expiry when time_months <= 0 (WIN_LOSS_SCORING_SPEC)', () => {
      const state = makeState({
        turn: 1,
        resources: { ...config.starting_resources, time_months: 0 },
      })
      const next = advanceTurn(state)
      expect(next.ending_type).toBe('mandate_revoked')
      expect(next.fail_reason).toBe('time_expiry')
      expect(next.session.turn).toBe(1)
    })

    it('sets ending_type mandate_revoked for 3-turn critical stability streak (WIN_LOSS test case)', () => {
      const critical: Metrics = {
        stability: 24,
        insurgency: 50,
        civilian_support: 50,
        global_legitimacy: 50,
        regional_synergy: 50,
      }
      let state = makeState({
        turn: 6,
        metrics: critical,
        metric_history: {
          4: critical,
          5: critical,
        },
      })
      state = { ...state, config: { ...state.config, turn_duration_months: config.turn_duration_months ?? [] } }
      const next = advanceTurn(state)
      expect(next.ending_type).toBe('mandate_revoked')
      expect(next.fail_reason).toBe('critical_streak_stability')
    })
  })

  describe('AI director category counterpressure', () => {
    it('adds +10 opposition pressure when one action category is used 3 times in the last 4 turns', () => {
      const content = { actions: actionsJson as GameContent['actions'] } as GameContent
      const state = makeState({
        turn: 4,
        ai_state: {
          ...config.starting_ai_state,
          opposition_pressure: 20,
        },
        metrics: {
          ...config.starting_metrics,
          stability: 50,
          civilian_support: 50,
          global_legitimacy: 50,
        },
        content,
        action_log: [1, 2, 4].map((turn) => ({
          turn,
          action_id: 'security_patrol_deployment',
          target: { zone_id: 'mopti' },
          resolution_timing: 'immediate_action' as const,
          costs: { ...config.starting_resources },
          resource_deltas: {},
          metric_deltas: {},
          flag_additions: [],
        })),
      })

      expect(detectRepeatedActionCategoryUse(state)).toEqual({ category: 'security', count: 3 })
      expect(applyAiDirector(state, state.session.metrics, undefined)).toBe(30)
    })

    it('counts community mediation toward diplomacy and humanitarian category pressure aliases', () => {
      const content = { actions: actionsJson as GameContent['actions'] } as GameContent
      const state = makeState({
        turn: 4,
        content,
        action_log: [
          'diplomacy_junta_engagement',
          'diplomacy_ecowas_coordination',
          'community_led_mediation',
        ].map((action_id, index) => ({
          turn: index + 1,
          action_id,
          target: action_id === 'community_led_mediation'
            ? { zone_id: 'mopti' }
            : { actor_key: 'regional_ecowas' },
          resolution_timing: 'immediate_action' as const,
          costs: { ...config.starting_resources },
          resource_deltas: {},
          metric_deltas: {},
          flag_additions: [],
        })),
      })

      expect(detectRepeatedActionCategoryUse(state)).toEqual({ category: 'diplomacy', count: 3 })
    })
  })

  describe('evaluateEnding (WIN_LOSS_SCORING_SPEC)', () => {
    it('returns strategic_success when all thresholds met and no critical in T19-20 (test case 1)', () => {
      const m: Metrics = {
        stability: 78,
        insurgency: 32,
        civilian_support: 81,
        global_legitimacy: 84,
        regional_synergy: 77,
      }
      const state = makeState({
        turn: 20,
        metrics: m,
        metric_snapshot_turn_19: m,
      })
      expect(evaluateEnding(state)).toBe('strategic_success')
    })

    it('returns fragile_success when all thresholds met and positive metric in High range (test case 2)', () => {
      const m: Metrics = {
        stability: 63,
        insurgency: 40,
        civilian_support: 76,
        global_legitimacy: 80,
        regional_synergy: 82,
      }
      const state = makeState({ turn: 20, metrics: m, metric_snapshot_turn_19: m })
      expect(evaluateEnding(state)).toBe('fragile_success')
    })

    it('returns stalemate when 1-2 thresholds missed (WIN_LOSS: 2 missed, no critical zone)', () => {
      const m: Metrics = {
        stability: 55,
        insurgency: 50,
        civilian_support: 49,
        global_legitimacy: 60,
        regional_synergy: 60,
      }
      const state = makeState({ turn: 20, metrics: m })
      expect(evaluateEnding(state)).toBe('stalemate')
    })

    it('returns regional_setback when 3+ thresholds missed', () => {
      const m: Metrics = {
        stability: 40,
        insurgency: 55,
        civilian_support: 40,
        global_legitimacy: 40,
        regional_synergy: 40,
      }
      const state = makeState({ turn: 20, metrics: m })
      expect(evaluateEnding(state)).toBe('regional_setback')
    })
  })

  describe('checkEarlyFail', () => {
    it('returns failed false when no streak and time > 0', () => {
      const metrics: Metrics = { ...config.starting_metrics }
      const state = makeState({
        turn: 5,
        resources: { ...config.starting_resources, time_months: 40 },
        metrics,
        metric_history: { 3: metrics, 4: metrics },
      })
      const result = checkEarlyFail(state, state.metric_history, state.session.metrics)
      expect(result.failed).toBe(false)
    })
  })
})
