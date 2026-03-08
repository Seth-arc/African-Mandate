import type {
  ActorData,
  DialogueChoiceData,
  DialogueData,
  GameContent,
  IntelReportResolved,
  LocalizationContent,
  RelationshipLabel,
  TerritoryStatus,
} from './types'

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function resolveLocalizedText(
  localization: LocalizationContent | undefined,
  key: string | null | undefined
): string {
  if (!key) return ''
  return localization?.strings[key] ?? key
}

export function relationshipLabelFromScore(score: number): RelationshipLabel {
  if (score <= 20) return 'hostile'
  if (score <= 40) return 'adversarial'
  if (score <= 60) return 'neutral'
  if (score <= 80) return 'cooperative'
  return 'allied'
}

export function deriveActorStance(label: RelationshipLabel): string {
  return label
}

export function deriveDialogueState(actor: Pick<ActorData, 'activation_condition'>): string {
  return actor.activation_condition ? 'locked' : 'available'
}

export function deriveZoneThreatLevel(stability: number, insurgency: number): number {
  return clampPercent(0.6 * insurgency + 0.4 * (100 - stability))
}

export function threatLevelToStatus(threatLevel: number): TerritoryStatus {
  if (threatLevel <= 24) return 'low'
  if (threatLevel <= 49) return 'moderate'
  if (threatLevel <= 74) return 'high'
  return 'critical'
}

export function resolveTerritoryName(content: GameContent | undefined, territoryKey: string): string {
  const territory = content?.territories.territories.find((item) => item.territory_key === territoryKey)
  return territory
    ? resolveLocalizedText(content?.localization, territory.name_key)
    : territoryKey
}

export function resolveZoneName(content: GameContent | undefined, zoneId: string): string {
  const zone = content?.zones.zones.find((item) => item.zone_id === zoneId)
  return zone
    ? resolveLocalizedText(content?.localization, zone.name_key)
    : zoneId
}

export function resolveActorName(content: GameContent | undefined, actorKey: string): string {
  const actor = content?.actors.actors.find((item) => item.actor_key === actorKey)
  return actor
    ? resolveLocalizedText(content?.localization, actor.name_key)
    : actorKey
}

export function resolveActorTitle(content: GameContent | undefined, actorKey: string): string {
  const actor = content?.actors.actors.find((item) => item.actor_key === actorKey)
  return actor
    ? resolveLocalizedText(content?.localization, actor.title_key)
    : actorKey
}

export function resolveActorData(content: GameContent | undefined, actorKey: string): ActorData | undefined {
  return content?.actors.actors.find((item) => item.actor_key === actorKey)
}

function findDialogueById(content: GameContent | undefined, dialogueId: string): DialogueData | undefined {
  return content?.dialogues.dialogues.find((dialogue) => dialogue.dialogue_id === dialogueId)
}

function findDialogueChoice(dialogue: DialogueData | undefined, choiceId: string): DialogueChoiceData | undefined {
  if (!dialogue) {
    return undefined
  }
  for (const node of Object.values(dialogue.node_graph)) {
    const choices = node?.choices
    const choice = choices?.find((item) => item.choice_id === choiceId)
    if (choice) {
      return choice
    }
  }
  return undefined
}

function resolveDialogueChoiceLabel(content: GameContent | undefined, dialogueId: string, choiceId: string): string {
  const dialogue = findDialogueById(content, dialogueId)
  const choice = findDialogueChoice(dialogue, choiceId)
  if (!choice) {
    return `${dialogueId}:${choiceId}`
  }
  return resolveLocalizedText(content?.localization, choice.label_key)
}

export function resolveActionName(content: GameContent | undefined, actionId: string): string {
  if (actionId.startsWith('event_penalty:')) {
    const eventId = actionId.slice('event_penalty:'.length)
    const event = content?.events.events.find((item) => item.event_id === eventId)
    if (event) {
      return `Penalty: ${resolveLocalizedText(content?.localization, event.narrative_text_key)}`
    }
    return `Penalty: ${eventId}`
  }

  if (actionId.startsWith('event:')) {
    const eventId = actionId.slice('event:'.length)
    const event = content?.events.events.find((item) => item.event_id === eventId)
    if (event) {
      return resolveLocalizedText(content?.localization, event.narrative_text_key)
    }
    return eventId
  }

  if (actionId.startsWith('dialogue:')) {
    const parts = actionId.split(':')
    const dialogueId = parts[1]
    const choiceId = parts[2]
    if (dialogueId && choiceId) {
      const label = resolveDialogueChoiceLabel(content, dialogueId, choiceId)
      return `Dialogue: ${label}`
    }
    return 'Dialogue'
  }

  const action = content?.actions.actions.find((item) => item.action_id === actionId)
  return action
    ? resolveLocalizedText(content?.localization, action.name_key)
    : actionId
}

export function resolveActionDescription(content: GameContent | undefined, actionId: string): string {
  const action = content?.actions.actions.find((item) => item.action_id === actionId)
  return action
    ? resolveLocalizedText(content?.localization, action.description_key)
    : actionId
}

export function resolveIntelReport(
  content: GameContent | undefined,
  reportKey: string
): IntelReportResolved | undefined {
  const report = content?.intel_reports.intel_reports.find((item) => item.report_key === reportKey)
  if (!report || !content) return undefined

  return {
    report_key: report.report_key,
    headline_text: resolveLocalizedText(content.localization, report.headline_key),
    body_text: resolveLocalizedText(content.localization, report.body_key),
    sources: [...report.sources],
    urgency: report.urgency,
    confidence_level: report.confidence_level,
    zone_scope: report.zone_scope,
    generated_by: report.generated_by,
    expiry_turns: report.expiry_turns,
  }
}
