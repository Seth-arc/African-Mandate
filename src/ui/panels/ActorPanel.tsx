/**
 * Actor panel. Loading, empty, populated. Data from gameStore.state.actor_sentiments or content.actors.
 */
import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import { resolveActorName, resolveActorTitle, resolveZoneName } from '../../state/selectors'
import { getActorDialogueAvailability, isActorActive } from '../../systems/dialogueResolver'

interface ActorPanelEntry {
  actorKey: string
  name: string
  title: string
  type: string
  active: boolean
  trackedRelationship: boolean
  relationship: string
  dialogueId: string
}

export function ActorPanel(): ReactNode {
  const state = useGameStore((s) => s.state)
  const actor_sentiments = state.actor_sentiments
  const zone_state = state.zone_state
  const content = useGameStore((s) => s.state.content)
  const actors = content?.actors?.actors ?? []
  const openModal = useUiStore((s) => s.openModal)
  const setActorKey = useUiStore((s) => s.setSelectedActorKey)
  const setSelectedDialogueId = useUiStore((s) => s.setSelectedDialogueId)
  const resetDialogueFlow = useUiStore((s) => s.resetDialogueFlow)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)

  const openDialogue = (actorKey: string, dialogueId: string): void => {
    setActorKey(actorKey)
    resetDialogueFlow()
    setSelectedDialogueId(dialogueId)
    openModal('dialogue')
  }

  const sortedActors = [...actors].sort((a, b) => {
    const aActive = isActorActive(state, a) ? 1 : 0
    const bActive = isActorActive(state, b) ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return resolveActorName(content, a.actor_key).localeCompare(resolveActorName(content, b.actor_key))
  })

  const renderRelationship = (actorKey: string, fallbackScore: number | null): string => {
    const sentiment = actor_sentiments?.[actorKey]
    if (sentiment) {
      return `${sentiment.relationship_label} (${sentiment.relationship_score})`
    }
    if (fallbackScore === null) {
      return 'Not relationship-tracked'
    }
    return `Baseline ${fallbackScore}`
  }

  const selectedZone = selectedZoneId ? zone_state?.[selectedZoneId] : undefined
  const selectedZoneActorCount = selectedZone?.actors_present.length ?? 0
  const selectedZoneName = selectedZoneId ? resolveZoneName(content, selectedZoneId) : null
  const actorEntries: ActorPanelEntry[] = sortedActors.flatMap((actor) => {
    const actorKey = actor.actor_key
    const active = isActorActive(state, actor)
    const trackedRelationship = actor.relationship_tracked && actor.default_relationship_score !== null
    const dialogueAvailability = getActorDialogueAvailability(state, actorKey)
    const canEngageNow = active && dialogueAvailability?.isAvailable === true && dialogueAvailability.dialogueId
    if (!canEngageNow) {
      return []
    }
    return [{
      actorKey,
      name: resolveActorName(content, actorKey),
      title: resolveActorTitle(content, actorKey),
      type: actor.type,
      active,
      trackedRelationship,
      relationship: renderRelationship(actorKey, actor.default_relationship_score),
      dialogueId: dialogueAvailability.dialogueId,
    }]
  })

  return (
    <div className="sidebar-panel" id="actor-panel">
      <h2 className="sidebar-panel-title">Actors</h2>
      <div className="actor-panel-notice" aria-label="Actor data scope">
        <p className="actor-panel-note">
          This panel lists canonical actors.
        </p>
        <p className="actor-panel-note">
          {selectedZone
            ? `${selectedZoneActorCount} zone contextual stakeholder${selectedZoneActorCount === 1 ? '' : 's'} in ${selectedZoneName}. Open zone detail for contextual actors.`
            : 'Zone contextual stakeholders are shown in zone detail modals.'}
        </p>
      </div>
      {selectedZone && selectedZoneActorCount > 0 && (
        <div className="actor-context-pill-list" aria-label="Selected zone contextual actors">
          {selectedZone.actors_present.slice(0, 3).map((actorName, index) => (
            <span className="actor-context-pill" key={`${actorName}-${index}`}>
              {actorName}
            </span>
          ))}
          {selectedZoneActorCount > 3 && (
            <span className="actor-context-pill actor-context-pill--overflow">
              +{selectedZoneActorCount - 3} more
            </span>
          )}
        </div>
      )}
      {content === undefined && <p className="game-text-muted">Loading actors...</p>}
      {content !== undefined && actors.length === 0 && <p className="game-text-muted">No actors loaded.</p>}
      {content !== undefined && actorEntries.length === 0 && (
        <div className="actor-empty-state">
          No actors are currently engageable. Trigger engagement actions or advance the turn.
        </div>
      )}
      {actorEntries.length > 0 && (
        <p className="actor-panel-count-note">
          Showing {actorEntries.length} actor{actorEntries.length === 1 ? '' : 's'} you can engage now.
        </p>
      )}
      {actorEntries.length > 0 && (
        <ul className="actor-list">
          {actorEntries.map((entry) => {
            return (
            <li
              key={entry.actorKey}
              className="actor-card"
              data-actor-key={entry.actorKey}
              onClick={() => openDialogue(entry.actorKey, entry.dialogueId)}
              onKeyDown={(event) => event.key === 'Enter' && openDialogue(entry.actorKey, entry.dialogueId)}
              role="button"
              tabIndex={0}
            >
              <div className="actor-card-name">
                {entry.name}
              </div>
              <div className="actor-card-title">
                {entry.title}
              </div>
              <div className="actor-card-interaction">
                <span className="actor-chip actor-chip-engageable">Engage now</span>
                <span className="actor-card-interaction-reason">
                  Dialogue available this turn.
                </span>
              </div>
              <div className="actor-card-meta">
                <span className={`actor-chip ${entry.active ? 'active' : 'inactive'}`}>
                  {entry.active ? 'Active' : 'Conditional'}
                </span>
                <span className="actor-chip actor-chip-canonical">
                  Canonical actor
                </span>
                <span className={`actor-chip ${entry.trackedRelationship ? 'actor-chip-relationship' : 'actor-chip-untracked'}`}>
                  {entry.trackedRelationship ? 'Relationship tracked' : 'Relationship untracked'}
                </span>
              </div>
              <div className="actor-card-meta actor-card-meta--secondary">
                <span className="actor-chip">
                  {entry.type}
                </span>
                <span className="actor-chip actor-chip-relationship-summary">
                  {entry.relationship}
                </span>
              </div>
              <div className="actor-card-actions">
                <button
                  type="button"
                  className="action-config-confirm actor-card-action"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDialogue(entry.actorKey, entry.dialogueId)
                  }}
                >
                  Open dialogue
                </button>
              </div>
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
