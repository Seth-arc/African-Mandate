/**
 * Actor panel. Loading, empty, populated. Data from gameStore.state.actor_sentiments or content.actors.
 */
import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import { resolveActorName, resolveActorTitle } from '../../state/selectors'
import { isActorActive } from '../../systems/dialogueResolver'

export function ActorPanel(): ReactNode {
  const state = useGameStore((s) => s.state)
  const actor_sentiments = state.actor_sentiments
  const content = useGameStore((s) => s.state.content)
  const actors = content?.actors?.actors ?? []
  const openModal = useUiStore((s) => s.openModal)
  const setActorKey = useUiStore((s) => s.setSelectedActorKey)

  const handleActorClick = (actorKey: string): void => {
    setActorKey(actorKey)
    openModal('actor_profile')
  }

  const displayList = [...actors].sort((a, b) => {
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
    if (fallbackScore !== null) {
      return `untracked (${fallbackScore})`
    }
    return 'untracked'
  }

  return (
    <div className="sidebar-panel" id="actor-panel">
      <h2 className="sidebar-panel-title">Actors</h2>
      {content === undefined && <p className="game-text-muted">Loading actors...</p>}
      {content !== undefined && displayList.length === 0 && <p className="game-text-muted">No actors loaded.</p>}
      {displayList.length > 0 && (
        <ul className="actor-list">
          {displayList.map((actor) => {
            const active = isActorActive(state, actor)
            const relationship = renderRelationship(actor.actor_key, actor.default_relationship_score)
            return (
            <li
              key={actor.actor_key}
              className="actor-card"
              data-actor-key={actor.actor_key}
              onClick={() => handleActorClick(actor.actor_key)}
              onKeyDown={(event) => event.key === 'Enter' && handleActorClick(actor.actor_key)}
              role="button"
              tabIndex={0}
            >
              <div className="actor-card-name">
                {resolveActorName(content, actor.actor_key)}
              </div>
              <div className="actor-card-title">
                {resolveActorTitle(content, actor.actor_key)}
              </div>
              <div className="actor-card-meta">
                <span className={`actor-chip ${active ? 'active' : 'inactive'}`}>
                  {active ? 'Active' : 'Conditional'}
                </span>
                <span className="actor-chip">
                  {actor.type}
                </span>
                <span className="actor-chip">
                  {relationship}
                </span>
              </div>
            </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
