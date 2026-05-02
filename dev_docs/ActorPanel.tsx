/**
 * Actor panel. Loading, empty, populated. Data from gameStore.state.actor_sentiments or content.actors.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import { resolveActorName, resolveActorTitle } from '../../state/selectors'
import { getResolvedCost, validateAction } from '../../systems/actionResolver'
import { getActorDialogueAvailability, isActorActive } from '../../systems/dialogueResolver'
import type { ActionDefinition, ActorData, Resources } from '../../state/types'

type ActorEngagementMode = 'dialogue' | 'action'
type ActorDialogueState = 'available' | 'pending' | 'none'
type ActorPanelFilter = 'all' | 'dialogue_open' | 'dialogue_pending'
const AU_COMMISSIONER_ACTOR_KEY = 'au_chairperson_diallo'

interface ActorPanelEntry {
  actor: ActorData
  actorKey: string
  name: string
  title: string
  dialogueState: ActorDialogueState
  canEngageNow: boolean
  engagementMode: ActorEngagementMode | null
  dialogueId: string | null
  actionId: string | null
  isMissionAuthority: boolean
}

function normalizeAssetSrc(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  return path.startsWith('/') ? path : `/${path}`
}

function actorInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
  if (tokens.length === 0) return '?'
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase()
  return `${tokens[0]!.charAt(0)}${tokens[tokens.length - 1]!.charAt(0)}`.toUpperCase()
}

function ActorCardPortrait({ actor, name }: { actor: ActorData; name: string }): ReactNode {
  const portraitSrc = normalizeAssetSrc(actor.portrait_url)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [actor.actor_key, portraitSrc])

  const showImage = Boolean(portraitSrc) && !imageFailed

  return (
    <div className={`actor-profile-portrait actor-card-portrait${showImage ? ' has-image' : ''}`}>
      {showImage && portraitSrc ? (
        <img
          className="actor-profile-portrait-image"
          src={portraitSrc}
          alt={`${name} portrait`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="actor-profile-portrait-fallback">{actorInitials(name)}</span>
      )}
    </div>
  )
}

export function ActorPanel(): ReactNode {
  const state = useGameStore((s) => s.state)
  const zone_state = state.zone_state
  const content = useGameStore((s) => s.state.content)
  const actors = content?.actors?.actors ?? []
  const [activeFilter, setActiveFilter] = useState<ActorPanelFilter>('all')
  const openModal = useUiStore((s) => s.openModal)
  const setActorKey = useUiStore((s) => s.setSelectedActorKey)
  const setSelectedDialogueId = useUiStore((s) => s.setSelectedDialogueId)
  const setSelectedAction = useUiStore((s) => s.setSelectedAction)
  const resetDialogueFlow = useUiStore((s) => s.resetDialogueFlow)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)

  const minimumActionAllocation = (action: ActionDefinition): Partial<Resources> => ({
    budget: action.costs.budget.min,
    political_capital: action.costs.political_capital.min,
    personnel: action.costs.personnel.min,
    intel_points: action.costs.intel_points.min,
    time_months: action.costs.time_months.min,
  })

  const openDialogue = (actorKey: string, dialogueId: string): void => {
    setActorKey(actorKey)
    resetDialogueFlow()
    setSelectedDialogueId(dialogueId)
    openModal('dialogue')
  }

  const openActorProfile = (actorKey: string): void => {
    setActorKey(actorKey)
    openModal('actor_profile')
  }

  const openActionPlanning = (actorKey: string, actionId: string): void => {
    setSelectedAction(actionId, { actor_key: actorKey })
    openModal('action_config')
  }

  const actorTargetActions = content?.actions.actions.filter(
    (action) => action.target_scope === 'actor' && (action.target_actors?.length ?? 0) > 0
  ) ?? []

  const sortedActors = [...actors].sort((a, b) => {
    const aPinned = a.actor_key === AU_COMMISSIONER_ACTOR_KEY ? 1 : 0
    const bPinned = b.actor_key === AU_COMMISSIONER_ACTOR_KEY ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned

    const aActive = isActorActive(state, a) ? 1 : 0
    const bActive = isActorActive(state, b) ? 1 : 0
    if (aActive !== bActive) return bActive - aActive
    return resolveActorName(content, a.actor_key).localeCompare(resolveActorName(content, b.actor_key))
  })

  const selectedZone = selectedZoneId ? zone_state?.[selectedZoneId] : undefined
  const selectedZoneActorCount = selectedZone?.actors_present.length ?? 0
  const actorEntries: ActorPanelEntry[] = sortedActors.flatMap((actor) => {
    const actorKey = actor.actor_key

    // AU Commissioner: always pinned. Resolve actual dialogue state so the card
    // upgrades to fully engageable when a briefing is active, and falls back to
    // the greyed-out mission authority card when no dialogue window is open.
    if (actorKey === AU_COMMISSIONER_ACTOR_KEY) {
      const dialogueAvailability = getActorDialogueAvailability(state, actorKey)
      const dialogueState: ActorDialogueState = !dialogueAvailability
        ? 'none'
        : dialogueAvailability.isAvailable
          ? 'available'
          : 'pending'
      const hasDialogue = dialogueState === 'available' && Boolean(dialogueAvailability?.dialogueId)
      const canEngageNow = hasDialogue
      const engagementMode: ActorEngagementMode | null = hasDialogue ? 'dialogue' : null
      return [{
        actor,
        actorKey,
        name: resolveActorName(content, actorKey),
        title: resolveActorTitle(content, actorKey),
        dialogueState,
        canEngageNow,
        engagementMode,
        dialogueId: hasDialogue ? dialogueAvailability?.dialogueId ?? null : null,
        actionId: null,
        isMissionAuthority: true,
      }]
    }

    const active = isActorActive(state, actor)
    const dialogueAvailability = getActorDialogueAvailability(state, actorKey)
    const actionableActorAction = actorTargetActions.find((action) => {
      if (!action.target_actors?.includes(actorKey)) return false
      try {
        const cost = getResolvedCost(action, minimumActionAllocation(action))
        validateAction(state, action, { actor_key: actorKey }, cost)
        return true
      } catch {
        return false
      }
    })
    const dialogueState: ActorDialogueState = !dialogueAvailability
      ? 'none'
      : dialogueAvailability.isAvailable
        ? 'available'
        : 'pending'
    const hasDialogue = dialogueState === 'available' && Boolean(dialogueAvailability?.dialogueId)
    const hasAction = Boolean(actionableActorAction)
    const shouldShowActor = active && (dialogueState !== 'none' || hasAction)
    if (!shouldShowActor) {
      return []
    }
    const canEngageNow = hasDialogue || hasAction
    const engagementMode: ActorEngagementMode | null = hasDialogue ? 'dialogue' : hasAction ? 'action' : null
    return [{
      actor,
      actorKey,
      name: resolveActorName(content, actorKey),
      title: resolveActorTitle(content, actorKey),
      dialogueState,
      canEngageNow,
      engagementMode,
      dialogueId: hasDialogue ? dialogueAvailability?.dialogueId ?? null : null,
      actionId: actionableActorAction?.action_id ?? null,
      isMissionAuthority: false,
    }]
  })

  const filteredEntries = actorEntries.filter((entry) => {
    if (entry.isMissionAuthority) return true
    if (activeFilter === 'dialogue_open') {
      return entry.dialogueState === 'available'
    }
    if (activeFilter === 'dialogue_pending') {
      return entry.dialogueState === 'pending'
    }
    return true
  })

  const filterOptions: Array<{ key: ActorPanelFilter; label: string; tooltipId: string }> = [
    { key: 'all', label: 'All', tooltipId: 'actor.filter.all' },
    { key: 'dialogue_open', label: 'Dialogue Open', tooltipId: 'actor.filter.dialogue_open' },
    { key: 'dialogue_pending', label: 'Not Yet Available', tooltipId: 'actor.filter.dialogue_pending' },
  ]

  const filteredEmptyMessage = activeFilter === 'dialogue_open'
    ? 'No actors have dialogue available right now.'
    : activeFilter === 'dialogue_pending'
      ? 'No actors are waiting on dialogue unlock conditions right now.'
      : 'No actors are currently visible. Advance the campaign timeline or unlock actor routes.'

  const openEngagement = (entry: ActorPanelEntry): void => {
    if (entry.engagementMode === 'dialogue' && entry.dialogueId) {
      openDialogue(entry.actorKey, entry.dialogueId)
      return
    }
    if (entry.actionId) {
      openActionPlanning(entry.actorKey, entry.actionId)
    }
  }

  return (
    <div className="sidebar-panel" id="actor-panel" data-ui-tooltip="panel.actor_roster">
      <h2 className="sidebar-panel-title">Actors</h2>
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
          No actors are currently visible. Advance the campaign timeline or unlock actor routes.
        </div>
      )}
      {actorEntries.length > 0 && (
        <div className="actor-filter-row" role="group" aria-label="Filter actors by dialogue availability">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`actor-filter-btn${activeFilter === option.key ? ' is-active' : ''}`}
              data-ui-tooltip={option.tooltipId}
              onClick={() => setActiveFilter(option.key)}
              aria-pressed={activeFilter === option.key}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {actorEntries.length > 0 && (
        <p className="actor-panel-count-note">
          Select a card to review the actor profile, or use Engage to jump straight into the engagement flow when it
          is available.
        </p>
      )}
      {actorEntries.length > 0 && filteredEntries.length === 0 && (
        <div className="actor-empty-state">
          {filteredEmptyMessage}
        </div>
      )}
      {filteredEntries.length > 0 && (
        <ul className="actor-list">
          {filteredEntries.map((entry) => {
            if (entry.isMissionAuthority) {
              const briefingBadgeLabel = entry.dialogueState === 'available'
                ? 'Briefing open'
                : entry.dialogueState === 'pending'
                  ? 'Briefing pending'
                  : 'Mission Authority'
              const briefingBadgeClass = entry.dialogueState === 'available'
                ? 'actor-chip actor-chip-engageable'
                : entry.dialogueState === 'pending'
                  ? 'actor-chip actor-chip-locked'
                  : 'actor-chip actor-chip-mission-authority'
              return (
                <li
                  key={entry.actorKey}
                  className={`actor-card${entry.dialogueState === 'none' ? ' actor-card--mission-authority' : ''}`}
                  data-actor-key={entry.actorKey}
                  data-ui-tooltip="actor.card"
                >
                  <button
                    type="button"
                    className="actor-card-trigger"
                    onClick={() => openActorProfile(entry.actorKey)}
                    aria-haspopup="dialog"
                    aria-label={`Open profile for ${entry.name}`}
                  >
                    <div className="actor-card-header">
                      <ActorCardPortrait actor={entry.actor} name={entry.name} />
                      <div className="actor-card-heading">
                        <div className="actor-card-name-row">
                          <div className="actor-card-name">
                            {entry.name}
                          </div>
                          <span className={briefingBadgeClass}>
                            {briefingBadgeLabel}
                          </span>
                        </div>
                        <div className="actor-card-title">
                          {entry.title}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="actor-card-actions">
                    <button
                      type="button"
                      className="action-config-confirm actor-card-action"
                      data-ui-tooltip="actor.engage"
                      onClick={() => openEngagement(entry)}
                      disabled={!entry.canEngageNow}
                    >
                      Engage
                    </button>
                  </div>
                </li>
              )
            }
            const availabilityBadgeLabel = entry.dialogueState === 'available'
              ? 'Dialogue open'
              : entry.dialogueState === 'pending'
                ? 'Dialogue pending'
                : 'Action ready'
            const availabilityBadgeClass = entry.dialogueState === 'pending'
              ? 'actor-chip actor-chip-locked'
              : 'actor-chip actor-chip-engageable'
            return (
              <li
                key={entry.actorKey}
                className="actor-card"
                data-actor-key={entry.actorKey}
                data-ui-tooltip="actor.card"
              >
                <button
                  type="button"
                  className="actor-card-trigger"
                  onClick={() => openActorProfile(entry.actorKey)}
                  aria-haspopup="dialog"
                  aria-label={`Open profile for ${entry.name}`}
                >
                  <div className="actor-card-header">
                    <ActorCardPortrait actor={entry.actor} name={entry.name} />
                    <div className="actor-card-heading">
                      <div className="actor-card-name-row">
                        <div className="actor-card-name">
                          {entry.name}
                        </div>
                        <span className={availabilityBadgeClass}>
                          {availabilityBadgeLabel}
                        </span>
                      </div>
                      <div className="actor-card-title">
                        {entry.title}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="actor-card-actions">
                  <button
                    type="button"
                    className="action-config-confirm actor-card-action"
                    data-ui-tooltip="actor.engage"
                    onClick={() => openEngagement(entry)}
                    disabled={!entry.canEngageNow}
                  >
                    Engage
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
