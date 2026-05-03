/**
 * Dialogue resolution engine:
 * - validates dialogue availability and choice costs
 * - applies resource/metric/actor deltas immutably
 * - records structured log entries for status report surfaces
 */

import type {
  ActionLogEntry,
  ActorData,
  ActorSentiment,
  AuditStatusState,
  DialogueChoiceData,
  DialogueData,
  DialogueNodeData,
  GameState,
  Metrics,
  Resources,
} from '../state/types'
import { GameError } from '../state/types'

const METRIC_KEYS: (keyof Metrics)[] = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
]

const RESOURCE_KEYS: (keyof Resources)[] = [
  'budget',
  'political_capital',
  'personnel',
  'intel_points',
  'time_months',
]

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampResource(value: number): number {
  return Math.max(0, Math.round(value))
}

function relationshipLabelFromScore(score: number): ActorSentiment['relationship_label'] {
  if (score <= 20) return 'hostile'
  if (score <= 40) return 'adversarial'
  if (score <= 60) return 'neutral'
  if (score <= 80) return 'cooperative'
  return 'allied'
}

function evaluateAtomicCondition(state: GameState, expression: string): boolean {
  const normalized = expression.trim()
  if (normalized.length === 0) {
    return true
  }

  const turnMatch = /^turn\s*==\s*(\d+)$/i.exec(normalized)
  if (turnMatch) {
    return state.session.turn === Number(turnMatch[1])
  }

  const flagMatch = /^([a-zA-Z0-9_.-]+)\s*==\s*(true|false)$/i.exec(normalized)
  if (flagMatch) {
    const flagKey = flagMatch[1]
    const expectedToken = flagMatch[2]
    if (!flagKey || !expectedToken) {
      throw new GameError(`Unsupported dialogue condition: ${normalized}`, 'INVALID_DIALOGUE_CONDITION')
    }
    const expected = expectedToken.toLowerCase() === 'true'
    const actual = state.narrative_flags?.[flagKey] ?? false
    return actual === expected
  }

  throw new GameError(`Unsupported dialogue condition: ${normalized}`, 'INVALID_DIALOGUE_CONDITION')
}

/**
 * Supports simple boolean expressions joined by AND/OR with equality checks.
 * Examples:
 * - "turn == 5"
 * - "junta_dialogue_initiated == true"
 * - "flag_a == true AND flag_b == false"
 */
export function evaluateDialogueCondition(state: GameState, condition: string | undefined): boolean {
  if (!condition || condition.trim().length === 0) {
    return true
  }

  const orSegments = condition.split(/\s+OR\s+/i)
  for (const orSegment of orSegments) {
    const andSegments = orSegment.split(/\s+AND\s+/i)
    const allTrue = andSegments.every((part) => evaluateAtomicCondition(state, part))
    if (allTrue) {
      return true
    }
  }
  return false
}

export function isActorActive(state: GameState, actor: Pick<ActorData, 'activation_condition'>): boolean {
  return evaluateDialogueCondition(state, actor.activation_condition)
}

function findDialogueById(state: GameState, dialogueId: string): DialogueData {
  const dialogue = state.content?.dialogues.dialogues.find((item) => item.dialogue_id === dialogueId)
  if (!dialogue) {
    throw new GameError(`Dialogue not found: ${dialogueId}`, 'DIALOGUE_NOT_FOUND')
  }
  return dialogue
}

function getPrimaryChoiceNode(dialogue: DialogueData): DialogueNodeData {
  const root = dialogue.node_graph.root
  if (!root) {
    throw new GameError(`Dialogue ${dialogue.dialogue_id} missing root node`, 'INVALID_DIALOGUE_GRAPH')
  }

  if (root.next) {
    const linked = dialogue.node_graph[root.next]
    if (linked?.type === 'choice' && linked.choices) {
      return linked
    }
  }

  const fallback = Object.values(dialogue.node_graph).find((node) => node?.type === 'choice' && node.choices)
  if (!fallback) {
    throw new GameError(`Dialogue ${dialogue.dialogue_id} has no choice node`, 'INVALID_DIALOGUE_GRAPH')
  }
  return fallback
}

function getOutcomeTextKey(dialogue: DialogueData, choice: DialogueChoiceData): string | null {
  const outcomeNode = dialogue.node_graph[choice.next]
  if (!outcomeNode?.text_key) {
    return null
  }
  return outcomeNode.text_key
}

function applyMetricEffects(current: Metrics, effects: Partial<Metrics> | undefined): Metrics {
  if (!effects) {
    return { ...current }
  }
  const next = { ...current }
  for (const key of METRIC_KEYS) {
    const delta = effects[key]
    if (delta !== undefined) {
      next[key] = clampMetric(current[key] + delta)
    }
  }
  return next
}

function applyResourceEffects(current: Resources, effects: Partial<Resources> | undefined): Resources {
  if (!effects) {
    return { ...current }
  }
  const next = { ...current }
  for (const key of RESOURCE_KEYS) {
    const delta = effects[key]
    if (delta !== undefined) {
      next[key] = clampResource(current[key] + delta)
    }
  }
  return next
}

function deriveMetricDeltas(before: Metrics, after: Metrics): Partial<Metrics> {
  const out: Partial<Metrics> = {}
  for (const key of METRIC_KEYS) {
    const delta = after[key] - before[key]
    if (delta !== 0) {
      out[key] = delta
    }
  }
  return out
}

function deriveResourceDeltas(before: Resources, after: Resources): Partial<Resources> {
  const out: Partial<Resources> = {}
  for (const key of RESOURCE_KEYS) {
    const delta = after[key] - before[key]
    if (delta !== 0) {
      out[key] = delta
    }
  }
  return out
}

function applyDialogueCosts(resources: Resources, choice: DialogueChoiceData): Resources {
  const costBudget = choice.costs.budget ?? 0
  const costPolitical = choice.costs.political_capital ?? 0

  if (costBudget < 0 || costPolitical < 0) {
    throw new GameError('Dialogue costs must be non-negative', 'INVALID_DIALOGUE_COST')
  }
  if (resources.budget < costBudget) {
    throw new GameError(
      `Insufficient budget for dialogue choice: need ${costBudget}, have ${resources.budget}`,
      'INSUFFICIENT_BUDGET'
    )
  }
  if (resources.political_capital < costPolitical) {
    throw new GameError(
      `Insufficient political capital for dialogue choice: need ${costPolitical}, have ${resources.political_capital}`,
      'INSUFFICIENT_POLITICAL_CAPITAL'
    )
  }

  return {
    ...resources,
    budget: clampResource(resources.budget - costBudget),
    political_capital: clampResource(resources.political_capital - costPolitical),
  }
}

function applyRelationshipDelta(
  sentiment: ActorSentiment | undefined,
  delta: number | undefined
): ActorSentiment | undefined {
  if (!sentiment || delta === undefined) {
    return sentiment ? { ...sentiment } : undefined
  }
  const relationshipScore = Math.max(0, Math.min(100, sentiment.relationship_score + delta))
  const relationshipLabel = relationshipLabelFromScore(relationshipScore)
  return {
    ...sentiment,
    relationship_score: relationshipScore,
    relationship_label: relationshipLabel,
    stance: relationshipLabel,
    dialogue_state: 'completed',
  }
}

function dialogueCostSnapshot(choice: DialogueChoiceData): Resources {
  return {
    budget: choice.costs.budget ?? 0,
    political_capital: choice.costs.political_capital ?? 0,
    personnel: 0,
    intel_points: 0,
    time_months: 0,
  }
}

function collectDialogueFlags(choice: DialogueChoiceData): string[] {
  const out = [...(choice.effects.flags ?? [])]
  if (choice.effects.sets_audit_status) {
    out.push(`audit_status_${choice.effects.sets_audit_status}`)
  }
  return out
}

function applyDialogueFlags(
  state: GameState,
  choice: DialogueChoiceData
): {
  narrativeFlags: Record<string, boolean>
  narrativeFlagTurns: Record<string, number>
  auditStatus: AuditStatusState | undefined
} {
  const narrativeFlags = { ...(state.narrative_flags ?? {}) }
  const narrativeFlagTurns = { ...(state.narrative_flag_turns ?? {}) }
  for (const flag of choice.effects.flags ?? []) {
    narrativeFlags[flag] = true
    if (narrativeFlagTurns[flag] === undefined) {
      narrativeFlagTurns[flag] = state.session.turn
    }
  }
  let auditStatus: AuditStatusState | undefined
  const status = choice.effects.sets_audit_status
  if (status) {
    const statusFlag = `audit_status_${status}`
    narrativeFlags[statusFlag] = true
    if (narrativeFlagTurns[statusFlag] === undefined) {
      narrativeFlagTurns[statusFlag] = state.session.turn
    }
    auditStatus = {
      status,
      set_on_turn: state.session.turn,
    }
  }
  return {
    narrativeFlags,
    narrativeFlagTurns,
    auditStatus,
  }
}

function assertDialogueAvailable(state: GameState, dialogue: DialogueData): void {
  if (dialogue.available_turns.length > 0 && !dialogue.available_turns.includes(state.session.turn)) {
    throw new GameError(
      `Dialogue ${dialogue.dialogue_id} unavailable on turn ${state.session.turn}`,
      'DIALOGUE_UNAVAILABLE_TURN'
    )
  }
  if (!evaluateDialogueCondition(state, dialogue.trigger_condition)) {
    throw new GameError(
      `Dialogue trigger condition not met: ${dialogue.dialogue_id}`,
      'DIALOGUE_TRIGGER_NOT_MET'
    )
  }
}

export interface DialogueChoiceResult {
  state: GameState
  dialogue: DialogueData
  choice: DialogueChoiceData
  outcomeTextKey: string | null
  relationshipDelta: number
  relationshipAfter: ActorSentiment | null
  logEntry: ActionLogEntry
}

/**
 * Applies one dialogue choice and returns updated state + structured result.
 * This does not consume an action slot.
 */
export function executeDialogueChoice(
  state: GameState,
  dialogueId: string,
  choiceId: string
): DialogueChoiceResult {
  const dialogue = findDialogueById(state, dialogueId)
  assertDialogueAvailable(state, dialogue)

  const choiceNode = getPrimaryChoiceNode(dialogue)
  const choice = choiceNode.choices?.find((item) => item.choice_id === choiceId)
  if (!choice) {
    throw new GameError(
      `Choice ${choiceId} not found in dialogue ${dialogue.dialogue_id}`,
      'DIALOGUE_CHOICE_NOT_FOUND'
    )
  }

  const beforeMetrics = { ...state.session.metrics }
  const beforeResources = { ...state.session.resources }
  const beforeSentiment = state.actor_sentiments?.[dialogue.actor_key]

  const resourcesAfterCosts = applyDialogueCosts(beforeResources, choice)
  const metricsAfterEffects = applyMetricEffects(beforeMetrics, choice.effects.metrics)
  const resourcesAfterEffects = applyResourceEffects(resourcesAfterCosts, choice.effects.resources)
  const relationshipDelta = choice.effects.actor_relationship ?? 0
  const relationshipAfter = applyRelationshipDelta(beforeSentiment, choice.effects.actor_relationship) ?? null

  const actorSentiments = relationshipAfter
    ? {
        ...(state.actor_sentiments ?? {}),
        [dialogue.actor_key]: relationshipAfter,
      }
    : state.actor_sentiments

  const flagResolution = applyDialogueFlags(state, choice)
  const metricDeltas = deriveMetricDeltas(beforeMetrics, metricsAfterEffects)
  const resourceDeltas = deriveResourceDeltas(beforeResources, resourcesAfterEffects)
  const flagAdditions = collectDialogueFlags(choice)

  const logEntry: ActionLogEntry = {
    turn: state.session.turn,
    action_id: `dialogue:${dialogue.dialogue_id}:${choice.choice_id}`,
    target: { actor_key: dialogue.actor_key },
    resolution_timing: 'immediate_dialogue',
    costs: dialogueCostSnapshot(choice),
    metric_deltas: metricDeltas,
    resource_deltas: resourceDeltas,
    flag_additions: flagAdditions,
  }

  const nextState: GameState = {
    ...state,
    session: {
      ...state.session,
      metrics: metricsAfterEffects,
      resources: resourcesAfterEffects,
    },
    actor_sentiments: actorSentiments,
    narrative_flags: flagResolution.narrativeFlags,
    narrative_flag_turns: flagResolution.narrativeFlagTurns,
    audit_status: flagResolution.auditStatus ?? state.audit_status,
    action_log: [...(state.action_log ?? []), logEntry],
  }

  return {
    state: nextState,
    dialogue,
    choice,
    outcomeTextKey: getOutcomeTextKey(dialogue, choice),
    relationshipDelta,
    relationshipAfter,
    logEntry,
  }
}

export interface ActorDialogueAvailability {
  dialogueId: string
  isAvailable: boolean
  reason: string | null
}

/**
 * Returns the first dialogue bound to an actor, with availability metadata.
 */
export function getActorDialogueAvailability(
  state: GameState,
  actorKey: string
): ActorDialogueAvailability | null {
  const dialogues = state.content?.dialogues.dialogues.filter((dialogue) => dialogue.actor_key === actorKey) ?? []
  if (dialogues.length === 0) {
    return null
  }
  const currentWindowDialogues = dialogues.filter(
    (dialogue) => dialogue.available_turns.length === 0 || dialogue.available_turns.includes(state.session.turn)
  )
  const availableDialogue = currentWindowDialogues.find((dialogue) =>
    evaluateDialogueCondition(state, dialogue.trigger_condition)
  )
  if (availableDialogue) {
    return {
      dialogueId: availableDialogue.dialogue_id,
      isAvailable: true,
      reason: null,
    }
  }

  const blockedDialogue = currentWindowDialogues[0]
  if (blockedDialogue) {
    return {
      dialogueId: blockedDialogue.dialogue_id,
      isAvailable: false,
      reason: 'Trigger condition not met',
    }
  }

  const nextDialogue =
    dialogues.find((dialogue) =>
      dialogue.available_turns.length === 0 || dialogue.available_turns.some((turn) => turn >= state.session.turn)
    ) ??
    dialogues[0]
  if (!nextDialogue) {
    return null
  }
  return {
    dialogueId: nextDialogue.dialogue_id,
    isAvailable: false,
    reason: `Available turns: ${nextDialogue.available_turns.join(', ')}`,
  }
}
