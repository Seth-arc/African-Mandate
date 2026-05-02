import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import type { TerritoryKey, TerritoryState } from '../../state/types'
import { describeEndingOutcome, describeFailReason, isActTransition } from '../../systems/turnEngine'
import { resolveZoneName } from '../../state/selectors'
import { ResourcePanel } from '../panels/ResourcePanel'
import { MetricsPanel } from '../panels/MetricsPanel'
import { TurnProgressPanel } from '../panels/TurnProgressPanel'
import { MapView } from '../../map/MapView'
import { IntelFeed } from '../panels/IntelFeed'
import { ActorPanel } from '../panels/ActorPanel'
import { ActionBar } from './ActionBar'
import { ModalRoot } from '../modals/ModalRoot'
import { useSessionStore } from '../../state/sessionStore'
import { useTour } from '../../tour/TourContext'
import { UiTooltipLayer } from '../tooltips/UiTooltipLayer'

function territoryFromState(
  territoryState: Record<TerritoryKey, TerritoryState> | undefined,
  territoryKey: string | null
): TerritoryState | undefined {
  if (!territoryState || !territoryKey) return undefined
  if (!Object.prototype.hasOwnProperty.call(territoryState, territoryKey)) return undefined
  return territoryState[territoryKey as TerritoryKey]
}

export function GameLayout(): ReactNode {
  const state = useGameStore((s) => s.state)
  const session = useGameStore((s) => s.state.session)
  const content = useGameStore((s) => s.state.content)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const endingType = useGameStore((s) => s.state.ending_type)
  const failReason = useGameStore((s) => s.state.fail_reason)
  const openModal = useUiStore((s) => s.openModal)
  const setPendingCutscene = useUiStore((s) => s.setPendingCutscene)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const authMode = useSessionStore((s) => s.auth_mode)
  const saveSessionState = useSessionStore((s) => s.saveState)
  const { start: startTour } = useTour()
  const lastObservedTurnRef = useRef<number | null>(null)
  const shownOutcomeRef = useRef<boolean>(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const selectedZone = selectedZoneId ? zoneState?.[selectedZoneId] : undefined
  const effectiveTerritoryKey = selectedZone?.territory_key ?? selectedTerritoryKey
  const selectedTerritory = territoryFromState(territoryState, effectiveTerritoryKey)
  const territoryZones = effectiveTerritoryKey
    ? Object.values(zoneState ?? {}).filter((zone) => zone.territory_key === effectiveTerritoryKey)
    : []
  const criticalZones = territoryZones.filter((zone) => zone.threat_level >= 75)
  const topZone = territoryZones.reduce<typeof territoryZones[number] | null>(
    (current, zone) => {
      if (!current || zone.threat_level > current.threat_level) return zone
      return current
    },
    null
  )

  useEffect(() => {
    const previousTurn = lastObservedTurnRef.current
    if (previousTurn === null) {
      lastObservedTurnRef.current = session.turn
      return
    }
    if (session.turn !== previousTurn) {
      if (isActTransition(previousTurn, session.turn) && !state.ending_type) {
        const openingCutscene = content?.cutscenes.cutscenes.find(
          (scene) => scene.trigger_turn === session.turn && scene.cutscene_id.startsWith('cutscene_act') && scene.cutscene_id.includes('opening')
        )
        if (openingCutscene) {
          setPendingCutscene(openingCutscene.cutscene_id, 'act_briefing')
          openModal('cutscene_player')
        } else {
          openModal('act_briefing')
        }
      }
      lastObservedTurnRef.current = session.turn
    }
  }, [content, openModal, session.turn, setPendingCutscene, state.ending_type])

  useEffect(() => {
    if (endingType && !shownOutcomeRef.current) {
      const endingCutscene = content?.cutscenes.cutscenes.find(
        (scene) => scene.cutscene_id === `cutscene_ending_${endingType}`
      )
      if (endingCutscene) {
        setPendingCutscene(endingCutscene.cutscene_id, 'campaign_outcome')
        openModal('cutscene_player')
      } else {
        openModal('campaign_outcome')
      }
      shownOutcomeRef.current = true
      return
    }
    if (!endingType) {
      shownOutcomeRef.current = false
    }
  }, [content, endingType, openModal, setPendingCutscene])

  useEffect(() => {
    if (!menuOpen || typeof window === 'undefined') return

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const handleSaveSession = async (): Promise<void> => {
    setMenuOpen(false)
    try {
      await saveSessionState(state, 'manual', 'manual')
    } finally {
      openModal('session_manager')
    }
  }

  const handleLoadSession = (): void => {
    setMenuOpen(false)
    openModal('session_manager')
  }

  const handleSettings = (): void => {
    setMenuOpen(false)
    openModal('session_manager')
  }

  const handleTutorial = (): void => {
    setMenuOpen(false)
    startTour()
  }

  const handleCredits = (): void => {
    setMenuOpen(false)
    openModal('credits')
  }

  const handleExit = (): void => {
    setMenuOpen(false)
    if (typeof window !== 'undefined') {
      window.location.href = window.location.pathname
    }
  }

  return (
    <div className="game-shell">
      <header className="game-header">
        <div className="game-header-left">
          <a className="game-logo game-logo-link" href="/" aria-label="Return to landing page">
            <div className="game-logo-title">African Mandate</div>
            <div className="game-logo-subtitle">Sahel Arena</div>
          </a>
          <div className="game-header-badges">
            <span className="game-demo-badge" data-ui-tooltip="shell.demo_mode">Demo Mode - Synthetic Data</span>
            <span className="game-mode-status" data-ui-tooltip="shell.mode_status">
              {authMode === 'authenticated' ? 'Cloud Mode' : 'Guest Mode'}
            </span>
          </div>
        </div>
        <nav className="game-header-nav">
          <button
            type="button"
            className="game-nav-btn"
            id="btn-onboarding-tour"
            data-ui-tooltip="nav.onboarding"
            onClick={() => startTour()}
          >
            Onboarding
          </button>
          <button
            type="button"
            className="game-nav-btn"
            id="btn-mission-brief"
            data-ui-tooltip="nav.mission_brief"
            onClick={() => openModal('mission_brief')}
          >
            Mission brief
          </button>
          <button
            type="button"
            className="game-nav-btn"
            id="btn-status-report"
            data-ui-tooltip="nav.status_report"
            onClick={() => openModal('status_report')}
          >
            Status report
          </button>
          <div className="game-menu" ref={menuRef}>
            <button
              type="button"
              className="game-nav-btn game-menu-trigger"
              id="btn-menu"
              data-ui-tooltip="nav.menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              Menu
            </button>
            {menuOpen && (
              <div className="game-menu-dropdown" role="menu" aria-label="Session menu">
                <button type="button" className="game-menu-item" role="menuitem" onClick={() => void handleSaveSession()}>
                  Save Session
                </button>
                <button type="button" className="game-menu-item" role="menuitem" onClick={handleLoadSession}>
                  Load Session
                </button>
                <button type="button" className="game-menu-item" role="menuitem" onClick={handleSettings}>
                  Settings
                </button>
                <button type="button" className="game-menu-item" role="menuitem" onClick={handleTutorial}>
                  Tutorial
                </button>
                <button type="button" className="game-menu-item" role="menuitem" onClick={handleCredits}>
                  Credits
                </button>
                <div className="game-menu-divider" />
                <button type="button" className="game-menu-item danger" role="menuitem" onClick={handleExit}>
                  Exit
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="game-main">
        <aside className="sidebar-left">
          <TurnProgressPanel />
          <ResourcePanel />
          <MetricsPanel />
        </aside>

        <div className="game-center">
          <div className="game-map-wrap">
            <MapView />
          </div>
          <section className="game-scenario-panel" id="scenario-panel" data-ui-tooltip="panel.scenario">
            {endingType ? (
              <>
                <div className="game-scenario-title" id="territory-info">
                  Campaign concluded: {endingType.split('_').join(' ')}
                </div>
                <div className="game-scenario-description">
                  {describeEndingOutcome(endingType, failReason)}
                </div>
                {failReason && (
                  <div className="game-scenario-description">
                    Fail trigger: {describeFailReason(failReason)}
                  </div>
                )}
                <div className="game-scenario-actions">
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('campaign_outcome')}
                  >
                    View campaign outcome
                  </button>
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('status_report')}
                  >
                    View status report
                  </button>
                </div>
              </>
            ) : !content || !territoryState || !zoneState ? (
              <>
                <div className="game-scenario-title" id="territory-info">
                  Operational feed loading
                </div>
                <div className="game-scenario-description">
                  Syncing territory and zone telemetry from runtime state.
                </div>
              </>
            ) : selectedZone && selectedZoneId ? (
              <>
                <div className="game-scenario-title" id="territory-info">
                  {resolveZoneName(content, selectedZoneId)} - Zone detail
                </div>
                <div className="game-scenario-description">
                  {selectedZone.threats[0] ??
                    'No immediate threat annotation for this zone. Open zone detail for actor and incident context.'}
                </div>
                <div className="game-scenario-kpis">
                  <span>Threat {selectedZone.threat_level}</span>
                  <span>Stability {selectedZone.stability}</span>
                  <span>Insurgency {selectedZone.insurgency}</span>
                  <span>IDPs {selectedZone.displaced.toLocaleString()}</span>
                </div>
                <div className="game-scenario-actions">
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('zone_detail')}
                  >
                    Open zone detail
                  </button>
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('zone_list')}
                  >
                    View territory zones
                  </button>
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('territory_overview')}
                  >
                    Territory overview
                  </button>
                </div>
              </>
            ) : selectedTerritory && effectiveTerritoryKey ? (
              <>
                <div className="game-scenario-title" id="territory-info">
                  {selectedTerritory.name} - Territory overview
                </div>
                <div className="game-scenario-description">
                  {criticalZones.length > 0
                    ? `${criticalZones.length} critical zone${criticalZones.length === 1 ? '' : 's'} require immediate action.`
                    : 'No critical zones currently flagged. Maintain pressure and watch intel feeds for escalation.'}
                </div>
                <div className="game-scenario-kpis">
                  <span>Status {selectedTerritory.status}</span>
                  <span>Stability {selectedTerritory.stability}</span>
                  <span>Insurgency {selectedTerritory.insurgency}</span>
                  <span>Zones {territoryZones.length}</span>
                </div>
                {topZone && (
                  <div className="game-scenario-description">
                    Highest-risk zone: {resolveZoneName(content, topZone.zone_id)} (threat {topZone.threat_level}).
                  </div>
                )}
                <div className="game-scenario-actions">
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('territory_overview')}
                  >
                    Open territory overview
                  </button>
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('zone_list')}
                  >
                    Open zone list
                  </button>
                  {topZone && (
                    <button
                      type="button"
                      className="game-scenario-btn"
                      onClick={() => {
                        setSelectedZone(topZone.zone_id)
                        openModal('zone_detail')
                      }}
                    >
                      Open top-risk zone
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="game-scenario-title" id="territory-info">
                  Tactical overview
                </div>
                <div className="game-scenario-description">
                  Select a territory or zone on the map to inspect operational context, then open the detail
                  surfaces for decisions.
                </div>
                <div className="game-scenario-actions">
                  <button
                    type="button"
                    className="game-scenario-btn"
                    onClick={() => openModal('mission_brief')}
                  >
                    Mission brief
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="sidebar-right">
          <IntelFeed />
          <ActorPanel />
        </aside>
      </main>

      <ActionBar />
      <UiTooltipLayer />
      <ModalRoot />
    </div>
  )
}
