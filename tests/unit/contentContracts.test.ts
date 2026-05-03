import { describe, expect, it } from 'vitest'
import { assertSupportedActionCondition } from '../../src/systems/actionConditionEvaluator'
import type {
  ActionDefinition,
  ActorData,
  CutsceneData,
  DialogueData,
  IntelReportData,
  TerritoryData,
  ZoneData,
} from '../../src/state/types'
import actionsJson from '../../src/data/actions.json'
import actorsJson from '../../src/data/actors.json'
import cutscenesJson from '../../src/data/cutscenes.json'
import dialoguesJson from '../../src/data/dialogues.json'
import intelReportsJson from '../../src/data/intel_reports.json'
import localizationJson from '../../src/data/localization_en.json'
import territoriesJson from '../../src/data/territories.json'
import zonesJson from '../../src/data/zones.json'

const actions = actionsJson.actions as ActionDefinition[]
const actors = actorsJson.actors as ActorData[]
const cutscenes = cutscenesJson.cutscenes as CutsceneData[]
const dialogues = dialoguesJson.dialogues as DialogueData[]
const intelReports = intelReportsJson.intel_reports as IntelReportData[]
const territories = territoriesJson.territories as TerritoryData[]
const zones = zonesJson.zones as ZoneData[]
const localeStrings = localizationJson.strings as Record<string, string>

const metricKeys = new Set([
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
])

const resourceKeys = new Set([
  'budget',
  'political_capital',
  'personnel',
  'intel_points',
  'time_months',
])

const supportedTargetScopes = new Set(['zone', 'territory', 'actor'])
const supportedRiskKeys = new Set(['civilian_harm_chance', 'civilian_harm_effects'])
const endingTypes = new Set([
  'strategic_success',
  'fragile_success',
  'stalemate',
  'regional_setback',
  'mandate_revoked',
])

const actorKeys = new Set(actors.map((actor) => actor.actor_key))
const actionIds = new Set(actions.map((action) => action.action_id))
const dialogueIds = new Set(dialogues.map((dialogue) => dialogue.dialogue_id))

function hasLocalizationKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(localeStrings, key)
}

function expectLocalizationKey(key: string, label: string): void {
  expect(hasLocalizationKey(key), `${label} missing localization key ${key}`).toBe(true)
  expect(localeStrings[key]?.trim().length, `${label} localization key ${key} is empty`).toBeGreaterThan(0)
}

describe('content contracts', () => {
  it('resolves every authored localization key used by gameplay content', () => {
    for (const action of actions) {
      expectLocalizationKey(action.name_key, `${action.action_id}.name_key`)
      expectLocalizationKey(action.description_key, `${action.action_id}.description_key`)
    }

    for (const actor of actors) {
      expectLocalizationKey(actor.name_key, `${actor.actor_key}.name_key`)
      expectLocalizationKey(actor.title_key, `${actor.actor_key}.title_key`)
    }

    for (const territory of territories) {
      expectLocalizationKey(territory.name_key, `${territory.territory_key}.name_key`)
    }

    for (const zone of zones) {
      expectLocalizationKey(zone.name_key, `${zone.zone_id}.name_key`)
    }

    for (const report of intelReports) {
      expectLocalizationKey(report.headline_key, `${report.report_key}.headline_key`)
      expectLocalizationKey(report.body_key, `${report.report_key}.body_key`)
    }

    for (const dialogue of dialogues) {
      for (const [nodeId, node] of Object.entries(dialogue.node_graph)) {
        if (!node) continue
        if (node.text_key) {
          expectLocalizationKey(node.text_key, `${dialogue.dialogue_id}.${nodeId}.text_key`)
        }
        for (const choice of node.choices ?? []) {
          expectLocalizationKey(choice.label_key, `${dialogue.dialogue_id}.${choice.choice_id}.label_key`)
          expectLocalizationKey(choice.description_key, `${dialogue.dialogue_id}.${choice.choice_id}.description_key`)
        }
      }
    }

    for (const cutscene of cutscenes) {
      expectLocalizationKey(cutscene.text_key, `${cutscene.cutscene_id}.text_key`)
    }
  })

  it('keeps authored action conditions inside the supported evaluator grammar', () => {
    for (const action of actions) {
      assertSupportedActionCondition(action.requirements?.condition, `${action.action_id}.requirements.condition`)
      assertSupportedActionCondition(action.corruption_risk?.condition, `${action.action_id}.corruption_risk.condition`)
      expect(action.requirements?.condition?.trim().length ?? 1, `${action.action_id} condition is empty`).toBeGreaterThan(0)
      expect(action.corruption_risk?.condition?.trim().length ?? 1, `${action.action_id} corruption condition is empty`).toBeGreaterThan(0)
    }
  })

  it('pins action target scopes, actor targets, dialogue unlocks, and cost ranges', () => {
    for (const action of actions) {
      expect(supportedTargetScopes.has(action.target_scope), `${action.action_id} has unsupported target_scope`).toBe(true)

      if (action.target_scope === 'actor') {
        expect(action.target_actors?.length ?? 0, `${action.action_id} actor target list is empty`).toBeGreaterThan(0)
        for (const actorKey of action.target_actors ?? []) {
          expect(actorKeys.has(actorKey), `${action.action_id} targets unknown actor ${actorKey}`).toBe(true)
        }
      } else {
        expect(action.target_actors ?? [], `${action.action_id} non-actor action must not declare target_actors`).toHaveLength(0)
      }

      if (action.unlocks_dialogue) {
        expect(dialogueIds.has(action.unlocks_dialogue), `${action.action_id} unlocks missing dialogue`).toBe(true)
      }

      for (const key of resourceKeys) {
        const range = action.costs[key as keyof typeof action.costs]
        expect(range, `${action.action_id} missing cost range for ${key}`).toBeDefined()
        expect(range.min, `${action.action_id}.${key}.min`).toBeLessThanOrEqual(range.default)
        expect(range.default, `${action.action_id}.${key}.default`).toBeLessThanOrEqual(range.max)
        expect(range.step, `${action.action_id}.${key}.step`).toBeGreaterThanOrEqual(0)
      }
    }

    for (const dialogue of dialogues) {
      expect(actorKeys.has(dialogue.actor_key), `${dialogue.dialogue_id} references unknown actor`).toBe(true)
      if (dialogue.unlock_action) {
        expect(actionIds.has(dialogue.unlock_action), `${dialogue.dialogue_id} unlock_action is unknown`).toBe(true)
      }
      for (const [nodeId, node] of Object.entries(dialogue.node_graph)) {
        if (!node) continue
        if (node.speaker_key) {
          expect(actorKeys.has(node.speaker_key), `${dialogue.dialogue_id}.${nodeId} speaker is unknown`).toBe(true)
        }
      }
    }
  })

  it('keeps risk definitions bounded and explicit', () => {
    for (const action of actions) {
      const risk = action.effects.risks
      if (!risk) continue

      for (const key of Object.keys(risk)) {
        expect(supportedRiskKeys.has(key), `${action.action_id} has unsupported risk key ${key}`).toBe(true)
      }

      expect(typeof risk.civilian_harm_chance, `${action.action_id} risk chance must be numeric`).toBe('number')
      expect(risk.civilian_harm_chance ?? -1, `${action.action_id} risk chance below 0`).toBeGreaterThanOrEqual(0)
      expect(risk.civilian_harm_chance ?? 2, `${action.action_id} risk chance above 1`).toBeLessThanOrEqual(1)

      const riskEffects = risk.civilian_harm_effects ?? {}
      expect(Object.keys(riskEffects), `${action.action_id} risk effects are empty`).not.toHaveLength(0)
      for (const [metricKey, delta] of Object.entries(riskEffects)) {
        expect(metricKeys.has(metricKey), `${action.action_id} risk affects unsupported metric ${metricKey}`).toBe(true)
        expect(Number.isFinite(delta), `${action.action_id} risk delta for ${metricKey} is not finite`).toBe(true)
        expect(delta, `${action.action_id} risk delta for ${metricKey} must be non-zero`).not.toBe(0)
      }
    }
  })

  it('keeps cutscene references deterministic and internally resolvable', () => {
    const seenCutsceneIds = new Set<string>()

    for (const cutscene of cutscenes) {
      expect(seenCutsceneIds.has(cutscene.cutscene_id), `${cutscene.cutscene_id} is duplicated`).toBe(false)
      seenCutsceneIds.add(cutscene.cutscene_id)

      expect(cutscene.act, `${cutscene.cutscene_id} act`).toBeGreaterThanOrEqual(1)
      expect(cutscene.act, `${cutscene.cutscene_id} act`).toBeLessThanOrEqual(5)
      expect(actorKeys.has(cutscene.speaker_key), `${cutscene.cutscene_id} speaker is unknown`).toBe(true)
      expect(cutscene.media_url, `${cutscene.cutscene_id} media path`).toMatch(/^assets\/vid\//)
      expect(cutscene.fallback_image_url, `${cutscene.cutscene_id} fallback image path`).toMatch(/^img\//)
      expect(cutscene.duration_seconds, `${cutscene.cutscene_id} duration`).toBeGreaterThan(0)

      const turnMatch = /^turn == (\d+)$/.exec(cutscene.trigger_condition)
      if (turnMatch) {
        expect(Number(turnMatch[1]), `${cutscene.cutscene_id} trigger_turn mismatch`).toBe(cutscene.trigger_turn)
        continue
      }

      const endingMatch = /^ending_([a-z_]+) == true$/.exec(cutscene.trigger_condition)
      expect(endingMatch, `${cutscene.cutscene_id} has unsupported trigger_condition`).not.toBeNull()
      expect(endingTypes.has(endingMatch?.[1] ?? ''), `${cutscene.cutscene_id} has unknown ending trigger`).toBe(true)
      expect(cutscene.trigger_turn, `${cutscene.cutscene_id} ending cutscene turn`).toBe(20)
      expect(cutscene.auto_advance, `${cutscene.cutscene_id} ending cutscene should auto advance`).toBe(true)
    }
  })
})
