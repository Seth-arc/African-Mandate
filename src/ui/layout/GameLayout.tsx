import { useEffect, useRef, type ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import type { TerritoryKey, TerritoryState } from '../../state/types'
import { describeEndingOutcome, describeFailReason, getActFromTurn, isActTransition } from '../../systems/turnEngine'
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
  const config = useGameStore((s) => s.state.config)
  const content = useGameStore((s) => s.state.content)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const endingType = useGameStore((s) => s.state.ending_type)
  const failReason = useGameStore((s) => s.state.fail_reason)
  const act = session ? getActFromTurn(session.turn) : 1
  const openModal = useUiStore((s) => s.openModal)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const authMode = useSessionStore((s) => s.auth_mode)
  const slots = config?.action_slots_per_turn ?? 3
  const lastObservedTurnRef = useRef<number | null>(null)
  const shownOutcomeRef = useRef<boolean>(false)

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
        openModal('act_briefing')
      }
      lastObservedTurnRef.current = session.turn
    }
  }, [session.turn, state.ending_type, openModal])

  useEffect(() => {
    if (endingType && !shownOutcomeRef.current) {
      openModal('campaign_outcome')
      shownOutcomeRef.current = true
      return
    }
    if (!endingType) {
      shownOutcomeRef.current = false
    }
  }, [endingType, openModal])

  return (
    <div className="game-shell">
      <header className="game-header">
        <div className="game-header-left">
          <div className="game-logo">
            <div className="game-logo-title">African Mandate</div>
            <div className="game-logo-subtitle">Sahel Arena</div>
          </div>
          <div className="game-act-turn">
            <div>
              <div className="game-act-label">Act</div>
              <div className="game-act-number">{act}</div>
            </div>
            <div className="game-actions-remaining">
              {session?.actions_remaining ?? 0} / {slots} actions
            </div>
          </div>
        </div>
        <nav className="game-header-nav">
          <button type="button" className="game-nav-btn" id="btn-sessions" onClick={() => openModal('session_manager')}>
            Sessions
          </button>
          <button type="button" className="game-nav-btn" id="btn-mission-brief" onClick={() => openModal('mission_brief')}>
            Mission brief
          </button>
          <button type="button" className="game-nav-btn" id="btn-leaderboard" onClick={() => openModal('leaderboard')}>
            Leaderboard
          </button>
          <button type="button" className="game-nav-btn" id="btn-status-report" onClick={() => openModal('status_report')}>
            Status report
          </button>
          <span className="game-text-muted" style={{ alignSelf: 'center' }}>
            {authMode === 'authenticated' ? 'Signed in' : 'Guest mode'}
          </span>
        </nav>
      </header>

      <main className="game-main">
        <aside className="sidebar-left">
          <ResourcePanel />
          <MetricsPanel />
          <TurnProgressPanel />
        </aside>

        <div className="game-center">
          <div className="game-map-wrap">
            <MapView />
          </div>
          <section className="game-scenario-panel" id="scenario-panel">
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
      <ModalRoot />
    </div>
  )
}
