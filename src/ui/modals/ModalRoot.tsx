import { useEffect, type ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore, type ModalKind } from '../../state/uiStore'
import { useSessionStore } from '../../state/sessionStore'
import type {
  ActionDefinition,
  ActionTarget,
  DialogueChoiceData,
  DialogueData,
  EndingType,
  Metrics,
  Resources,
  TerritoryKey,
  TerritoryState,
} from '../../state/types'
import {
  resolveActionDescription,
  resolveActionName,
  resolveActorData,
  resolveActorName,
  resolveActorTitle,
  resolveIntelReport,
  resolveLocalizedText,
  resolveTerritoryName,
  resolveZoneName,
} from '../../state/selectors'
import { executeActionWithLog, getResolvedCost, validateAction } from '../../systems/actionResolver'
import { executeDialogueChoice, getActorDialogueAvailability, isActorActive } from '../../systems/dialogueResolver'
import { markIntelReportRead } from '../../systems/intelResolver'
import { describeEndingOutcome, describeFailReason, getActFromTurn } from '../../systems/turnEngine'
import { GameError } from '../../state/types'
import { SessionManagerBody } from './SessionManagerBody'

const BACKDROP_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
} as const

const MODAL_STYLE = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '1.5rem',
  maxWidth: '90vw',
  maxHeight: '90vh',
  width: 'min(760px, 90vw)',
  overflow: 'auto',
  boxShadow: 'var(--shadow-lg)',
} as const

function modalTitle(modal: ModalKind): string {
  if (modal === 'onboarding_loading') return 'Initializing'
  if (modal === 'session_manager') return 'Sessions'
  if (modal === 'action_config') return 'Take Action'
  if (modal === 'territory_overview') return 'Territory overview'
  if (modal === 'zone_list') return 'Zone list'
  if (modal === 'zone_detail') return 'Zone detail'
  if (modal === 'intel_report') return 'Intel report'
  if (modal === 'actor_profile') return 'Actor profile'
  if (modal === 'player_profile') return 'Player profile'
  if (modal === 'dialogue') return 'Dialogue'
  if (modal === 'act_briefing') return 'Act briefing'
  if (modal === 'campaign_outcome') return 'Campaign outcome'
  if (modal === 'status_report') return 'Status report'
  if (modal === 'mission_brief') return 'Mission brief'
  if (modal === 'leaderboard') return 'Leaderboard'
  return 'Modal'
}

type LoadedContent = NonNullable<ReturnType<typeof useGameStore.getState>['state']['content']>
type CutsceneEntry = LoadedContent['cutscenes']['cutscenes'][number]
type StoreState = ReturnType<typeof useGameStore.getState>['state']

function territoryFromState(
  territoryState: Record<TerritoryKey, TerritoryState> | undefined,
  territoryKey: string | null
): TerritoryState | undefined {
  if (!territoryState || !territoryKey) return undefined
  if (!Object.prototype.hasOwnProperty.call(territoryState, territoryKey)) return undefined
  return territoryState[territoryKey as TerritoryKey]
}

function SectionTitle({ children }: { children: ReactNode }): ReactNode {
  return (
    <h3 style={{ margin: '0 0 0.4rem', color: 'var(--gold)', fontSize: '0.95rem', letterSpacing: '0.01em' }}>
      {children}
    </h3>
  )
}

function TerritoryOverviewBody(): ReactNode {
  const content = useGameStore((s) => s.state.content)
  const territoryState = useGameStore((s) => s.state.territory_state)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)

  const effectiveTerritoryKey =
    selectedTerritoryKey ?? (selectedZoneId ? zoneState?.[selectedZoneId]?.territory_key ?? null : null)

  if (!content || !territoryState || !zoneState) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading territory data...</p>
  }

  if (!effectiveTerritoryKey) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a territory on the map to view details.</p>
  }

  const territory = territoryFromState(territoryState, effectiveTerritoryKey)
  if (!territory) {
    return <p style={{ color: 'var(--text-secondary)' }}>No runtime state found for this territory.</p>
  }

  const zones = Object.values(zoneState)
    .filter((zone) => zone.territory_key === effectiveTerritoryKey)
    .sort((a, b) => b.threat_level - a.threat_level)

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.05rem' }}>{territory.name}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
        <span style={chipStyle}>Status {territory.status}</span>
        <span style={chipStyle}>Stability {territory.stability}</span>
        <span style={chipStyle}>Insurgency {territory.insurgency}</span>
        <span style={chipStyle}>Population {territory.population.toLocaleString()}</span>
      </div>
      <div>
        <SectionTitle>Priority zones</SectionTitle>
        <div style={{ marginBottom: '0.45rem' }}>
          <button type="button" style={compactButtonStyle} onClick={() => openModal('zone_list')}>
            Open complete zone list
          </button>
        </div>
        {zones.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No zones linked to this territory.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {zones.map((zone) => (
              <button
                key={zone.zone_id}
                type="button"
                style={listButtonStyle}
                onClick={() => {
                  setSelectedZone(zone.zone_id)
                  openModal('zone_detail')
                }}
              >
                <span>{resolveZoneName(content, zone.zone_id)}</span>
                <span style={{ color: 'var(--gold)' }}>Threat {zone.threat_level}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ZoneListBody(): ReactNode {
  const content = useGameStore((s) => s.state.content)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const setSelectedZone = useUiStore((s) => s.setSelectedZone)
  const openModal = useUiStore((s) => s.openModal)

  if (!content || !zoneState) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading zone list...</p>
  }

  const effectiveTerritoryKey =
    selectedTerritoryKey ?? (selectedZoneId ? zoneState[selectedZoneId]?.territory_key ?? null : null)

  if (!effectiveTerritoryKey) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a territory first to list its zones.</p>
  }

  const zones = Object.values(zoneState)
    .filter((zone) => zone.territory_key === effectiveTerritoryKey)
    .sort((a, b) => b.threat_level - a.threat_level)

  if (zones.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>No zones available for this territory.</p>
  }

  return (
    <div style={{ display: 'grid', gap: '0.55rem' }}>
      <SectionTitle>{resolveTerritoryName(content, effectiveTerritoryKey)}</SectionTitle>
      <div>
        <button type="button" style={compactButtonStyle} onClick={() => openModal('territory_overview')}>
          Back to territory overview
        </button>
      </div>
      {zones.map((zone) => (
        <button
          key={zone.zone_id}
          type="button"
          style={listButtonStyle}
          onClick={() => {
            setSelectedZone(zone.zone_id)
            openModal('zone_detail')
          }}
        >
          <span>{resolveZoneName(content, zone.zone_id)}</span>
          <span style={{ color: 'var(--gold)' }}>Threat {zone.threat_level}</span>
        </button>
      ))}
    </div>
  )
}

function ZoneDetailBody(): ReactNode {
  const content = useGameStore((s) => s.state.content)
  const zoneState = useGameStore((s) => s.state.zone_state)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const openModal = useUiStore((s) => s.openModal)

  if (!content || !zoneState) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading zone detail...</p>
  }

  if (!selectedZoneId) {
    return <p style={{ color: 'var(--text-secondary)' }}>Select a zone on the map to inspect details.</p>
  }

  const zone = zoneState[selectedZoneId]
  if (!zone) {
    return <p style={{ color: 'var(--text-secondary)' }}>Selected zone was not found in runtime state.</p>
  }

  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.05rem' }}>
        {resolveZoneName(content, zone.zone_id)}
      </div>
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
        <button type="button" style={compactButtonStyle} onClick={() => openModal('territory_overview')}>
          Back to territory overview
        </button>
        <button type="button" style={compactButtonStyle} onClick={() => openModal('zone_list')}>
          Back to zone list
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
        <span style={chipStyle}>Threat {zone.threat_level}</span>
        <span style={chipStyle}>Stability {zone.stability}</span>
        <span style={chipStyle}>Insurgency {zone.insurgency}</span>
        <span style={chipStyle}>Population {zone.population.toLocaleString()}</span>
        <span style={chipStyle}>Displaced {zone.displaced.toLocaleString()}</span>
      </div>
      <div>
        <SectionTitle>Threats</SectionTitle>
        {zone.threats.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No authored threats listed for this zone.</p>
        ) : (
          <ul style={listStyle}>
            {zone.threats.map((threat) => (
              <li key={threat}>{threat}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SectionTitle>Incidents</SectionTitle>
        {zone.incidents.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No incidents logged yet.</p>
        ) : (
          <ul style={listStyle}>
            {zone.incidents.map((incident) => (
              <li key={incident}>{incident}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <SectionTitle>Actors Present</SectionTitle>
        {zone.actors_present.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No actors annotated for this zone.</p>
        ) : (
          <ul style={listStyle}>
            {zone.actors_present.map((actor) => (
              <li key={actor}>{actor}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusReportBody(): ReactNode {
  const session = useGameStore((s) => s.state.session)
  const actionLog = useGameStore((s) => s.state.action_log ?? [])
  const content = useGameStore((s) => s.state.content)

  return (
    <div style={{ display: 'grid', gap: '0.8rem' }}>
      <div style={{ color: 'var(--text)', fontWeight: 700 }}>Turn {session.turn} operational report</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={chipStyle}>Actions remaining {session.actions_remaining}</span>
        <span style={chipStyle}>Budget {session.resources.budget.toLocaleString()}</span>
        <span style={chipStyle}>Personnel {session.resources.personnel.toLocaleString()}</span>
        <span style={chipStyle}>Intel {session.resources.intel_points}</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
        Metrics and resources are updated by confirmed actions and turn progression.
      </p>
      <div>
        <SectionTitle>Action log</SectionTitle>
        {actionLog.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actions recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {[...actionLog].slice(-8).reverse().map((entry, index) => (
              <div
                key={`${entry.turn}-${entry.action_id}-${index}`}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  background: 'var(--bg-panel)',
                  padding: '0.5rem 0.65rem',
                  display: 'grid',
                  gap: '0.3rem',
                }}
              >
                <div style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600 }}>
                  Turn {entry.turn}: {resolveActionName(content, entry.action_id)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Target: {formatTargetLabel(content, entry.target)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Resource delta: {formatResourceDelta(entry.resource_deltas)}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Metric delta: {formatMetricDelta(entry.metric_deltas)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ENVOY_ROLE_SUMMARY =
  'You were appointed by the AU Peace and Security Council to coordinate a regional, African-led stabilization campaign across the Sahel. Your remit combines security coordination, diplomacy, civilian protection, and institutional credibility management.'

const ENVOY_BACKGROUND_POINTS = [
  'University of Dakar: Political Science',
  'London School of Economics: Conflict, Security, and Development',
  'Former Senior Advisor to AU Commissioner for Peace and Security',
  'Known for cross-actor mediation in high-risk regional crises',
]

const ENVOY_MANDATE_POINTS = [
  'Can coordinate security, diplomacy, and humanitarian interventions across mapped territories',
  'Can engage state and non-state stakeholders through approved dialogue channels',
  'Operates under strict resource and time constraints set by mission configuration',
  'Mission outcome is judged by threshold metrics and fail conditions in campaign rules',
]

function PlayerProfileBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const openModal = useUiStore((s) => s.openModal)
  const turn = state.session.turn
  const act = getActFromTurn(turn)

  return (
    <div className="actor-profile-layout">
      <div className="actor-profile-header-row">
        <div>
          <div className="actor-profile-name">AU Special Envoy</div>
          <div className="actor-profile-title">Special Envoy for Sahel Stabilization</div>
        </div>
        <div className="actor-chip active">Mandate active</div>
      </div>

      <div className="actor-profile-grid">
        <div className="actor-profile-row">
          <span>Current act</span>
          <strong>{act}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Current turn</span>
          <strong>{turn} / {state.session.max_turns}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Total mandate window</span>
          <strong>{state.config.total_turns} turns</strong>
        </div>
        <div className="actor-profile-row">
          <span>Time remaining</span>
          <strong>{state.session.resources.time_months} months</strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Role</SectionTitle>
        <p className="actor-profile-text">
          {ENVOY_ROLE_SUMMARY}
        </p>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Background</SectionTitle>
        <ul style={listStyle}>
          {ENVOY_BACKGROUND_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Mandate authority</SectionTitle>
        <ul style={listStyle}>
          {ENVOY_MANDATE_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('mission_brief')}>
          Open mission context
        </button>
        <button type="button" className="action-config-confirm" onClick={() => openModal('status_report')}>
          Open status report
        </button>
      </div>
    </div>
  )
}

const MISSION_METRIC_KEYS: (keyof Metrics)[] = [
  'stability',
  'insurgency',
  'civilian_support',
  'global_legitimacy',
  'regional_synergy',
]

interface MissionThresholdRow {
  metricKey: keyof Metrics
  current: number
  thresholdRule: { operator: string; value: number } | undefined
  onTrack: boolean
}

interface TransitionCategorySummary {
  category: string
  count: number
}

interface ActTransitionSummary {
  previousAct: number
  startTurn: number
  endTurn: number
  startMetrics: Metrics
  endMetrics: Metrics
  metricDeltas: Record<keyof Metrics, number>
  actionsConfirmed: number
  dialogueEngagements: number
  eventsTriggered: number
  criticalZonesNow: number
  topCategories: TransitionCategorySummary[]
}

function thresholdSatisfied(value: number, operator: string, target: number): boolean {
  if (operator === '>=') return value >= target
  if (operator === '<=') return value <= target
  if (operator === '>') return value > target
  if (operator === '<') return value < target
  if (operator === '==') return value === target
  return false
}

function buildMissionThresholdRows(state: StoreState): MissionThresholdRow[] {
  return MISSION_METRIC_KEYS.map((metricKey) => {
    const current = state.session.metrics[metricKey]
    const thresholdRule = state.config.win_conditions[metricKey]
    const onTrack = thresholdRule
      ? thresholdSatisfied(current, thresholdRule.operator, thresholdRule.value)
      : false
    return {
      metricKey,
      current,
      thresholdRule,
      onTrack,
    }
  })
}

function getActionCategoryForLogEntry(state: StoreState, actionId: string): string {
  if (actionId.startsWith('dialogue:')) {
    return 'dialogue'
  }
  const action = state.content?.actions.actions.find((item) => item.action_id === actionId)
  return action?.category ?? 'other'
}

function buildActTransitionSummary(state: StoreState, act: number): ActTransitionSummary | null {
  if (act <= 1) {
    return null
  }

  const previousAct = act - 1
  const startTurn = (previousAct - 1) * 4 + 1
  const endTurn = Math.min(previousAct * 4, state.session.max_turns)

  const startMetrics =
    startTurn === 1
      ? { ...state.config.starting_metrics }
      : { ...(state.metric_history?.[startTurn - 1] ?? state.config.starting_metrics) }
  const endMetrics = { ...(state.metric_history?.[endTurn] ?? state.session.metrics) }

  const metricDeltas: Record<keyof Metrics, number> = {
    stability: endMetrics.stability - startMetrics.stability,
    insurgency: endMetrics.insurgency - startMetrics.insurgency,
    civilian_support: endMetrics.civilian_support - startMetrics.civilian_support,
    global_legitimacy: endMetrics.global_legitimacy - startMetrics.global_legitimacy,
    regional_synergy: endMetrics.regional_synergy - startMetrics.regional_synergy,
  }

  const actionEntries = (state.action_log ?? []).filter((entry) => entry.turn >= startTurn && entry.turn <= endTurn)
  const dialogueEngagements = actionEntries.filter((entry) => entry.action_id.startsWith('dialogue:')).length
  const eventsTriggered = (state.event_log ?? []).filter((entry) => entry.turn >= startTurn && entry.turn <= endTurn).length

  const categoryCounts = actionEntries.reduce<Record<string, number>>((acc, entry) => {
    const category = getActionCategoryForLogEntry(state, entry.action_id)
    const currentCount = acc[category] ?? 0
    return {
      ...acc,
      [category]: currentCount + 1,
    }
  }, {})

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }))

  const criticalZonesNow = Object.values(state.zone_state ?? {}).filter((zone) => zone.threat_level >= 75).length

  return {
    previousAct,
    startTurn,
    endTurn,
    startMetrics,
    endMetrics,
    metricDeltas,
    actionsConfirmed: actionEntries.length,
    dialogueEngagements,
    eventsTriggered,
    criticalZonesNow,
    topCategories,
  }
}

function formatThreshold(operator: string, target: number): string {
  return `${operator}${target}`
}

function formatSignedDelta(value: number): string {
  const rounded = Math.round(value)
  if (rounded > 0) {
    return `+${rounded}`
  }
  return `${rounded}`
}

function isFavorableDelta(metricKey: keyof Metrics, delta: number): boolean {
  if (metricKey === 'insurgency') {
    return delta <= 0
  }
  return delta >= 0
}

function deltaStatusLabel(metricKey: keyof Metrics, delta: number): string {
  if (delta === 0) {
    return 'Stable'
  }
  return isFavorableDelta(metricKey, delta) ? 'Improved' : 'Worsened'
}

function MissionBriefBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const openModal = useUiStore((s) => s.openModal)
  const turn = state.session.turn
  const act = getActFromTurn(turn)
  const turnsRemaining = Math.max(state.session.max_turns - turn + 1, 0)
  const currentTurnDuration = state.config.turn_duration_months?.[turn - 1]

  const actTitle =
    resolveOptionalLocalizedText(content, `loc.briefing.act${act}.title`) ?? `Act ${act} Briefing`
  const actTheme = resolveOptionalLocalizedText(content, `loc.briefing.act${act}.theme`)
  const actFocus = resolveOptionalLocalizedText(content, `loc.briefing.act${act}.focus`)
  const actFeeling = resolveOptionalLocalizedText(content, `loc.briefing.act${act}.feeling`)

  const thresholdRows = buildMissionThresholdRows(state)

  const criticalZones = Object.values(state.zone_state ?? {})
    .filter((zone) => zone.threat_level >= 75)
    .sort((a, b) => b.threat_level - a.threat_level)
    .slice(0, 4)

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">Mission brief</div>
      <div className="campaign-presentation-meta">
        <span className="action-config-chip">Act {act}</span>
        <span className="action-config-chip">Turn {turn} / {state.session.max_turns}</span>
        <span className="action-config-chip">Turns remaining {turnsRemaining}</span>
        <span className="action-config-chip">Time remaining {state.session.resources.time_months} months</span>
        {typeof currentTurnDuration === 'number' && (
          <span className="action-config-chip">Current turn cost {currentTurnDuration} months</span>
        )}
      </div>

      <div className="actor-profile-section">
        <SectionTitle>{actTitle}</SectionTitle>
        <p className="actor-profile-text">
          You are the AU Special Envoy coordinating regional stabilization across Mali, Burkina Faso, Niger, Chad, and
          Mauritania. Keep pressure on high-risk zones while preserving legitimacy and civilian support.
        </p>
        {actTheme && <p className="actor-profile-text">{actTheme}</p>}
        {actFocus && <p className="actor-profile-text">{actFocus}</p>}
        {actFeeling && <p className="actor-profile-text">{actFeeling}</p>}
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Envoy profile</SectionTitle>
        <p className="actor-profile-text">{ENVOY_ROLE_SUMMARY}</p>
        <div className="campaign-metric-grid">
          <div className="campaign-metric-row">
            <span>Current act</span>
            <strong>{act}</strong>
          </div>
          <div className="campaign-metric-row">
            <span>Current turn</span>
            <strong>{turn} / {state.session.max_turns}</strong>
          </div>
          <div className="campaign-metric-row">
            <span>Total mandate window</span>
            <strong>{state.config.total_turns} turns</strong>
          </div>
          <div className="campaign-metric-row">
            <span>Time remaining</span>
            <strong>{state.session.resources.time_months} months</strong>
          </div>
        </div>
        <SectionTitle>Background and mandate authority</SectionTitle>
        <ul style={listStyle}>
          {ENVOY_BACKGROUND_POINTS.slice(0, 2).map((point) => (
            <li key={point}>{point}</li>
          ))}
          {ENVOY_MANDATE_POINTS.slice(0, 2).map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div className="campaign-metric-grid">
        {thresholdRows.map((row) => (
          <div className="campaign-metric-row" key={row.metricKey}>
            <span>{formatTokenLabel(row.metricKey)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <strong>
                {row.current}
                {row.thresholdRule ? ` / ${formatThreshold(row.thresholdRule.operator, row.thresholdRule.value)}` : ''}
              </strong>
              <span className={`actor-chip ${row.onTrack ? 'active' : 'inactive'}`}>
                {row.onTrack ? 'On track' : 'At risk'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Critical zone watchlist</SectionTitle>
        {criticalZones.length === 0 ? (
          <p className="actor-profile-text">
            No zones are currently in the critical threat band. Keep monitoring intel and sustain pressure.
          </p>
        ) : (
          <ul style={listStyle}>
            {criticalZones.map((zone) => (
              <li key={zone.zone_id}>
                {resolveZoneName(content, zone.zone_id)} (Threat {zone.threat_level}, Stability {zone.stability},
                Insurgency {zone.insurgency})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('player_profile')}>
          Open full profile
        </button>
        <button type="button" className="action-config-secondary" onClick={() => openModal('status_report')}>
          View status report
        </button>
        <button type="button" className="action-config-confirm" onClick={() => openModal('action_config')}>
          Plan next action
        </button>
      </div>
    </div>
  )
}

function IntelReportBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const intelFeed = state.intel_feed
  const selectedReportKey = useUiStore((s) => s.selectedReportKey)
  const openModal = useUiStore((s) => s.openModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  const intelReport = selectedReportKey ? resolveIntelReport(content, selectedReportKey) : undefined
  const feedItem = selectedReportKey ? intelFeed?.find((item) => item.report_key === selectedReportKey) : undefined

  useEffect(() => {
    if (!selectedReportKey || !intelFeed) {
      return
    }
    const isUnread = intelFeed.some((item) => item.report_key === selectedReportKey && item.is_read === false)
    if (!isUnread) {
      return
    }
    try {
      const currentState = useGameStore.getState().state
      const nextState = markIntelReportRead(currentState, selectedReportKey)
      useGameStore.setState({ state: nextState })
      void autosaveState(nextState, 'intel').catch(() => undefined)
    } catch {
      // Keep intel modal usable even when persistence update fails.
    }
  }, [autosaveState, intelFeed, selectedReportKey])

  if (!selectedReportKey) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No intel report selected.</p>
  }
  if (!intelReport) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Intel report not found.</p>
  }

  const scope = intelReport.zone_scope ? resolveZoneName(content, intelReport.zone_scope) : 'Regional scope'
  const urgencyLabel = formatTokenLabel(intelReport.urgency)
  const confidenceLabel = formatTokenLabel(intelReport.confidence_level)
  const generatorLabel = formatTokenLabel(intelReport.generated_by)
  const turnsUntilExpiry = feedItem
    ? Math.max(0, feedItem.occurred_at + intelReport.expiry_turns - state.session.turn)
    : intelReport.expiry_turns
  const intelTitle = resolveOptionalLocalizedText(content, 'loc.intel.template.title') ?? 'Intelligence briefing'

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">{intelTitle}</div>
      <div className="campaign-presentation-meta">
        <span className={`actor-chip ${intelReport.urgency === 'critical' ? 'inactive' : 'active'}`}>
          Urgency {urgencyLabel}
        </span>
        <span className="actor-chip">Confidence {confidenceLabel}</span>
        <span className="actor-chip">{feedItem?.is_read ? 'Read' : 'Unread'}</span>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>{intelReport.headline_text}</SectionTitle>
        <p className="actor-profile-text">{intelReport.body_text}</p>
      </div>

      <div className="campaign-metric-grid">
        <div className="campaign-metric-row">
          <span>Scope</span>
          <strong>{scope}</strong>
        </div>
        <div className="campaign-metric-row">
          <span>Generated by</span>
          <strong>{generatorLabel}</strong>
        </div>
        <div className="campaign-metric-row">
          <span>First seen</span>
          <strong>{feedItem ? `Turn ${feedItem.occurred_at}` : 'Unknown'}</strong>
        </div>
        <div className="campaign-metric-row">
          <span>Expiry window</span>
          <strong>{turnsUntilExpiry} turns remaining</strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Sources</SectionTitle>
        {intelReport.sources.length === 0 ? (
          <p className="actor-profile-text">No sources listed for this report.</p>
        ) : (
          <div className="dialogue-choice-effects">
            {intelReport.sources.map((source) => (
              <span className="actor-chip" key={source}>{formatTokenLabel(source)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('action_config')}>
          Plan response
        </button>
      </div>
    </div>
  )
}

function resolveOptionalLocalizedText(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  key: string
): string | null {
  const text = resolveLocalizedText(content?.localization, key)
  return text === key ? null : text
}

function findActOpeningCutscene(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  act: number,
  turn: number
): CutsceneEntry | null {
  if (!content) {
    return null
  }
  const openingScenes = content.cutscenes.cutscenes.filter(
    (scene) => scene.act === act && scene.cutscene_id.includes('opening')
  )
  if (openingScenes.length === 0) {
    return null
  }
  return openingScenes.find((scene) => scene.trigger_turn === turn) ?? openingScenes[0] ?? null
}

function resolveActBriefingFallback(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  act: number
): string[] {
  const keys = [
    `loc.briefing.act${act}.diallo.line_001a`,
    `loc.briefing.act${act}.diallo.line_001b`,
    `loc.briefing.act${act}.diallo.line_001c`,
    `loc.briefing.act${act}.theme`,
    `loc.briefing.act${act}.focus`,
    `loc.briefing.act${act}.feeling`,
  ]
  return keys
    .map((key) => resolveOptionalLocalizedText(content, key))
    .filter((line): line is string => line !== null)
}

function findEndingCutscene(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  endingType: EndingType
): CutsceneEntry | null {
  if (!content) {
    return null
  }
  const expectedId = `cutscene_ending_${endingType}`
  return content.cutscenes.cutscenes.find((scene) => scene.cutscene_id === expectedId) ?? null
}

function resolveEndingFallbackText(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  endingType: EndingType
): string {
  if (endingType === 'mandate_revoked') {
    return (
      resolveOptionalLocalizedText(content, 'loc.ending.fail.diallo.line_001') ??
      resolveOptionalLocalizedText(content, 'loc.ending.fail.diallo.line_001a') ??
      'The Peace and Security Council has terminated your mandate.'
    )
  }
  return (
    resolveOptionalLocalizedText(content, 'loc.ending.success.diallo.line_001') ??
    resolveOptionalLocalizedText(content, 'loc.ending.success.diallo.line_001a') ??
    'Mission review complete. Final campaign outcome recorded.'
  )
}

function formatEndingTitle(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  endingType: EndingType
): string {
  const key = `loc.ending.${endingType}.title`
  return resolveOptionalLocalizedText(content, key) ?? formatTokenLabel(endingType)
}

function ActBriefingBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const openModal = useUiStore((s) => s.openModal)
  const turn = state.session.turn
  const act = getActFromTurn(turn)
  const cutscene = findActOpeningCutscene(content, act, turn)
  const briefingTitle =
    resolveOptionalLocalizedText(content, 'loc.cutscene.act_transition.title') ?? 'Act transition briefing'

  const cutsceneNarration = cutscene
    ? resolveOptionalLocalizedText(content, cutscene.text_key)
    : null
  const fallbackLines = resolveActBriefingFallback(content, act)
  const fallbackNarration =
    fallbackLines.length > 0
      ? fallbackLines.join(' ')
      : `Act ${act} has begun. Reassess priorities and align decisions with mandate thresholds.`
  const narration = cutsceneNarration ?? fallbackNarration
  const speaker = cutscene ? resolveActorName(content, cutscene.speaker_key) : 'AU Briefing Desk'
  const transitionSummary = buildActTransitionSummary(state, act)
  const highestRiskZones = Object.values(state.zone_state ?? {})
    .sort((a, b) => b.threat_level - a.threat_level)
    .slice(0, 3)

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">
        {briefingTitle} - Act {act}
      </div>
      <div className="campaign-presentation-meta">
        <span className="action-config-chip">Turn {turn}</span>
        <span className="action-config-chip">Speaker: {speaker}</span>
      </div>
      <p className="campaign-presentation-body">{narration}</p>
      {transitionSummary && (
        <div className="actor-profile-section">
          <SectionTitle>Transition Summary: Act {transitionSummary.previousAct}</SectionTitle>
          <div className="campaign-metric-grid">
            <div className="campaign-metric-row">
              <span>Turns reviewed</span>
              <strong>{transitionSummary.startTurn} - {transitionSummary.endTurn}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Actions confirmed</span>
              <strong>{transitionSummary.actionsConfirmed}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Dialogue engagements</span>
              <strong>{transitionSummary.dialogueEngagements}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Runtime events triggered</span>
              <strong>{transitionSummary.eventsTriggered}</strong>
            </div>
            <div className="campaign-metric-row">
              <span>Critical zones now</span>
              <strong>{transitionSummary.criticalZonesNow}</strong>
            </div>
          </div>
          <div className="campaign-metric-grid">
            {MISSION_METRIC_KEYS.map((metricKey) => {
              const delta = transitionSummary.metricDeltas[metricKey]
              const statusLabel = deltaStatusLabel(metricKey, delta)
              const statusClassName =
                delta === 0
                  ? 'actor-chip'
                  : isFavorableDelta(metricKey, delta)
                    ? 'actor-chip active'
                    : 'actor-chip inactive'
              return (
                <div className="campaign-metric-row" key={metricKey}>
                  <span>{formatTokenLabel(metricKey)} shift</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <strong>{formatSignedDelta(delta)}</strong>
                    <span className={statusClassName}>{statusLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {transitionSummary.topCategories.length > 0 && (
            <div className="dialogue-choice-effects">
              {transitionSummary.topCategories.map((item) => (
                <span className="actor-chip" key={item.category}>
                  {formatTokenLabel(item.category)} x{item.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="actor-profile-section">
        <SectionTitle>Immediate Priorities</SectionTitle>
        {highestRiskZones.length === 0 ? (
          <p className="actor-profile-text">No critical zones are flagged. Keep pressure on prevention and recovery.</p>
        ) : (
          <ul style={listStyle}>
            {highestRiskZones.map((zone) => (
              <li key={zone.zone_id}>
                {resolveZoneName(content, zone.zone_id)} (Threat {zone.threat_level}, Stability {zone.stability},
                Insurgency {zone.insurgency})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('mission_brief')}>
          Open mission brief
        </button>
        <button type="button" className="action-config-secondary" onClick={() => openModal('status_report')}>
          View status report
        </button>
        <button type="button" className="action-config-confirm" onClick={() => openModal('action_config')}>
          Continue to operations
        </button>
      </div>
    </div>
  )
}

function CampaignOutcomeBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const resetGame = useGameStore((s) => s.reset)
  const endingType = state.ending_type
  const failReason = state.fail_reason
  const content = state.content
  const closeModal = useUiStore((s) => s.closeModal)
  const openModal = useUiStore((s) => s.openModal)
  const resetUi = useUiStore((s) => s.reset)

  if (!endingType) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Campaign is still active.</p>
  }

  const endingCutscene = findEndingCutscene(content, endingType)
  const endingNarration = endingCutscene
    ? resolveOptionalLocalizedText(content, endingCutscene.text_key)
    : null
  const fallbackNarration = resolveEndingFallbackText(content, endingType)
  const narration = endingNarration ?? fallbackNarration
  const thresholdRows = buildMissionThresholdRows(state)
  const passedCount = thresholdRows.filter((row) => row.onTrack).length
  const failedRows = thresholdRows.filter((row) => !row.onTrack)
  const isNegativeOutcome = endingType === 'mandate_revoked' || endingType === 'regional_setback'

  const handleRestart = (): void => {
    resetGame()
    resetUi()
    openModal('mission_brief')
  }

  return (
    <div className="campaign-presentation">
      <div className="campaign-presentation-title">
        {formatEndingTitle(content, endingType)}
      </div>
      <div className="campaign-presentation-meta">
        <span className="action-config-chip">Turn {state.session.turn}</span>
        <span className="action-config-chip">Outcome {formatTokenLabel(endingType)}</span>
        <span className={`actor-chip ${isNegativeOutcome ? 'inactive' : 'active'}`}>
          Thresholds met {passedCount} / {thresholdRows.length}
        </span>
      </div>
      <p className="campaign-presentation-body">{narration}</p>
      <div className={`campaign-presentation-rationale ${isNegativeOutcome ? 'campaign-rationale-fail' : 'campaign-rationale-success'}`}>
        <strong>Rationale:</strong> {describeEndingOutcome(endingType, failReason)}
      </div>
      {failReason && (
        <div className="campaign-presentation-rationale campaign-rationale-fail">
          <strong>Fail trigger:</strong> {describeFailReason(failReason)}
        </div>
      )}
      <div className="campaign-metric-grid">
        {thresholdRows.map((row) => (
          <div className="campaign-metric-row" key={row.metricKey}>
            <span>{formatTokenLabel(row.metricKey)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <strong>
                {row.current}
                {row.thresholdRule ? ` / ${formatThreshold(row.thresholdRule.operator, row.thresholdRule.value)}` : ''}
              </strong>
              <span className={`actor-chip ${row.onTrack ? 'active' : 'inactive'}`}>
                {row.onTrack ? 'Passed' : 'Missed'}
              </span>
            </div>
          </div>
        ))}
      </div>
      {failedRows.length > 0 && (
        <div className="actor-profile-section">
          <SectionTitle>Thresholds still missed</SectionTitle>
          <ul style={listStyle}>
            {failedRows.map((row) => (
              <li key={row.metricKey}>
                {formatTokenLabel(row.metricKey)} at {row.current}
                {row.thresholdRule ? ` (required ${formatThreshold(row.thresholdRule.operator, row.thresholdRule.value)})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('status_report')}>
          View status report
        </button>
        <button type="button" className="action-config-confirm" onClick={handleRestart}>
          {resolveOptionalLocalizedText(content, 'loc.ui.action.new_campaign') ?? 'Restart campaign'}
        </button>
        <button type="button" className="action-config-secondary" onClick={closeModal}>
          Close
        </button>
      </div>
    </div>
  )
}

function ActorProfileBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const selectedActorKey = useUiStore((s) => s.selectedActorKey)
  const openModal = useUiStore((s) => s.openModal)
  const setSelectedDialogueId = useUiStore((s) => s.setSelectedDialogueId)
  const resetDialogueFlow = useUiStore((s) => s.resetDialogueFlow)

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading actor profile...</p>
  }
  if (!selectedActorKey) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actor selected.</p>
  }

  const actor = resolveActorData(content, selectedActorKey)
  if (!actor) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Actor not found.</p>
  }

  const actorSentiment = state.actor_sentiments?.[actor.actor_key]
  const actorActive = isActorActive(state, actor)
  const dialogueAvailability = getActorDialogueAvailability(state, actor.actor_key)
  const hasDialogue = dialogueAvailability !== null

  const openDialogue = (): void => {
    if (!hasDialogue) {
      return
    }
    resetDialogueFlow()
    if (dialogueAvailability) {
      setSelectedDialogueId(dialogueAvailability.dialogueId)
    }
    openModal('dialogue')
  }

  return (
    <div className="actor-profile-layout">
      <div className="actor-profile-header-row">
        <div>
          <div className="actor-profile-name">{resolveActorName(content, actor.actor_key)}</div>
          <div className="actor-profile-title">{resolveActorTitle(content, actor.actor_key)}</div>
        </div>
        <div className={`actor-chip ${actorActive ? 'active' : 'inactive'}`}>
          {actorActive ? 'Active' : 'Conditional'}
        </div>
      </div>

      <div className="actor-profile-grid">
        <div className="actor-profile-row">
          <span>Faction</span>
          <strong>{formatTokenLabel(actor.faction)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Type</span>
          <strong>{formatTokenLabel(actor.type)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Profile</span>
          <strong>{formatTokenLabel(actor.profile)}</strong>
        </div>
        <div className="actor-profile-row">
          <span>Relationship</span>
          <strong>
            {actorSentiment
              ? `${actorSentiment.relationship_label} (${actorSentiment.relationship_score})`
              : 'Untracked'}
          </strong>
        </div>
        <div className="actor-profile-row">
          <span>Dialogue status</span>
          <strong>
            {!hasDialogue
              ? 'No dialogue authored'
              : dialogueAvailability.isAvailable
                ? 'Available now'
                : dialogueAvailability.reason ?? 'Unavailable'}
          </strong>
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Notes</SectionTitle>
        <p className="actor-profile-text">{actor.notes ?? 'No additional notes.'}</p>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Activation</SectionTitle>
        <p className="actor-profile-text">
          {actor.activation_condition
            ? `Condition: ${actor.activation_condition}`
            : 'Always available in actor panel.'}
        </p>
      </div>

      <div className="action-config-review-actions">
        <button
          type="button"
          className="action-config-confirm"
          onClick={openDialogue}
          disabled={!hasDialogue}
        >
          {hasDialogue ? 'Open dialogue' : 'No dialogue authored'}
        </button>
      </div>
    </div>
  )
}

function DialogueBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const selectedActorKey = useUiStore((s) => s.selectedActorKey)
  const selectedDialogueId = useUiStore((s) => s.selectedDialogueId)
  const dialogueFlowStep = useUiStore((s) => s.dialogueFlowStep)
  const dialogueOutcomeTextKey = useUiStore((s) => s.dialogueOutcomeTextKey)
  const dialogueChoiceId = useUiStore((s) => s.dialogueChoiceId)
  const setSelectedDialogueId = useUiStore((s) => s.setSelectedDialogueId)
  const setDialogueOutcome = useUiStore((s) => s.setDialogueOutcome)
  const setDialogueFlowStep = useUiStore((s) => s.setDialogueFlowStep)
  const resetDialogueFlow = useUiStore((s) => s.resetDialogueFlow)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  const actor = content && selectedActorKey
    ? resolveActorData(content, selectedActorKey)
    : undefined
  const dialogueAvailability = actor
    ? getActorDialogueAvailability(state, actor.actor_key)
    : null

  useEffect(() => {
    if (!selectedDialogueId && dialogueAvailability) {
      setSelectedDialogueId(dialogueAvailability.dialogueId)
    }
  }, [dialogueAvailability, selectedDialogueId, setSelectedDialogueId])

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading dialogue...</p>
  }
  if (!selectedActorKey) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actor selected.</p>
  }
  if (!actor) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Actor not found.</p>
  }

  if (!dialogueAvailability) {
    return (
      <div className="actor-profile-layout">
        <p className="actor-profile-text">No authored dialogue exists for this actor.</p>
        <button type="button" className="action-config-secondary" onClick={() => openModal('actor_profile')}>
          Back to actor profile
        </button>
      </div>
    )
  }

  const dialogue =
    content.dialogues.dialogues.find((item) => item.dialogue_id === (selectedDialogueId ?? dialogueAvailability.dialogueId)) ??
    null
  if (!dialogue) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Dialogue not found.</p>
  }

  const rootText = dialogue.node_graph.root?.text_key
    ? resolveLocalizedText(content.localization, dialogue.node_graph.root.text_key)
    : 'No dialogue opening text available.'
  const choiceNode = findDialogueChoiceNode(dialogue)
  const choices = choiceNode?.choices ?? []

  const selectedChoice = dialogueChoiceId ? choices.find((choice) => choice.choice_id === dialogueChoiceId) : undefined
  const outcomeText = dialogueOutcomeTextKey
    ? resolveLocalizedText(content.localization, dialogueOutcomeTextKey)
    : 'Outcome unavailable.'
  const latestLog = state.action_log?.[state.action_log.length - 1]
  const latestRelationship = state.actor_sentiments?.[dialogue.actor_key]
  const isLatestDialogueEntry =
    latestLog?.action_id.startsWith(`dialogue:${dialogue.dialogue_id}:`) ?? false

  const executeChoice = (choiceId: string): void => {
    try {
      const result = executeDialogueChoice(state, dialogue.dialogue_id, choiceId)
      useGameStore.setState({ state: result.state })
      void autosaveState(result.state, 'dialogue').catch(() => undefined)
      setDialogueOutcome(result.outcomeTextKey, result.choice.choice_id)
    } catch (error: unknown) {
      if (error instanceof GameError) {
        window.alert(`Dialogue failed: ${error.message}`)
        return
      }
      window.alert('Dialogue failed due to an unexpected runtime error.')
    }
  }

  if (dialogueFlowStep === 'outcome') {
    return (
      <div className="actor-profile-layout">
        <div className="actor-profile-name">{resolveActorName(content, actor.actor_key)}</div>
        <div className="actor-profile-title">Dialogue outcome</div>
        <div className="actor-profile-section">
          {selectedChoice && (
            <>
              <SectionTitle>Selected response</SectionTitle>
              <p className="actor-profile-text">
                {resolveLocalizedText(content.localization, selectedChoice.label_key)}
              </p>
            </>
          )}
          <SectionTitle>Actor response</SectionTitle>
          <p className="actor-profile-text">{outcomeText}</p>
        </div>
        {isLatestDialogueEntry && latestLog && (
          <div className="actor-profile-grid">
            <div className="actor-profile-row">
              <span>Resource delta</span>
              <strong>{formatResourceDelta(latestLog.resource_deltas)}</strong>
            </div>
            <div className="actor-profile-row">
              <span>Metric delta</span>
              <strong>{formatMetricDelta(latestLog.metric_deltas)}</strong>
            </div>
            <div className="actor-profile-row">
              <span>Relationship now</span>
              <strong>
                {latestRelationship
                  ? `${latestRelationship.relationship_label} (${latestRelationship.relationship_score})`
                  : 'Untracked'}
              </strong>
            </div>
          </div>
        )}
        <div className="action-config-review-actions">
          <button
            type="button"
            className="action-config-secondary"
            onClick={() => {
              resetDialogueFlow()
              openModal('actor_profile')
            }}
          >
            Back to actor profile
          </button>
          <button type="button" className="action-config-confirm" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="actor-profile-layout">
      <div className="actor-profile-header-row">
        <div>
          <div className="actor-profile-name">{resolveActorName(content, actor.actor_key)}</div>
          <div className="actor-profile-title">{resolveActorTitle(content, actor.actor_key)}</div>
        </div>
        <div className={`actor-chip ${dialogueAvailability.isAvailable ? 'active' : 'inactive'}`}>
          {dialogueAvailability.isAvailable ? 'Open' : 'Locked'}
        </div>
      </div>

      <div className="actor-profile-section">
        <SectionTitle>Opening statement</SectionTitle>
        <p className="actor-profile-text">{rootText}</p>
      </div>

      {!dialogueAvailability.isAvailable && (
        <div className="action-config-validation">{dialogueAvailability.reason ?? 'Dialogue unavailable.'}</div>
      )}

      {dialogueAvailability.isAvailable && choices.length > 0 && (
        <div className="dialogue-choice-list">
          {choices.map((choice) => {
            const metricEffects = Object.entries(choice.effects.metrics ?? {})
              .map(([key, value]) => `${formatTokenLabel(key)} ${value > 0 ? '+' : ''}${value}`)
            const resourceEffects = Object.entries(choice.effects.resources ?? {})
              .map(([key, value]) => `${formatTokenLabel(key)} ${value > 0 ? '+' : ''}${value}`)
            const relationshipDelta = choice.effects.actor_relationship ?? 0
            return (
              <button
                key={choice.choice_id}
                type="button"
                className="dialogue-choice-card"
                onClick={() => executeChoice(choice.choice_id)}
              >
                <div className="dialogue-choice-label">
                  {resolveLocalizedText(content.localization, choice.label_key)}
                </div>
                <div className="dialogue-choice-description">
                  {resolveLocalizedText(content.localization, choice.description_key)}
                </div>
                <div className="dialogue-choice-effects">
                  {(choice.costs.budget ?? 0) > 0 && (
                    <span className="actor-chip">Budget -{(choice.costs.budget ?? 0).toLocaleString()}</span>
                  )}
                  {(choice.costs.political_capital ?? 0) > 0 && (
                    <span className="actor-chip">Political -{choice.costs.political_capital}</span>
                  )}
                  <span className="actor-chip">
                    Relationship {relationshipDelta > 0 ? '+' : ''}{relationshipDelta}
                  </span>
                  {metricEffects.map((effect) => (
                    <span key={effect} className="actor-chip">{effect}</span>
                  ))}
                  {resourceEffects.map((effect) => (
                    <span key={effect} className="actor-chip">{effect}</span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="action-config-review-actions">
        <button type="button" className="action-config-secondary" onClick={() => openModal('actor_profile')}>
          Back to actor profile
        </button>
        {dialogueFlowStep !== 'choices' && (
          <button type="button" className="action-config-secondary" onClick={() => setDialogueFlowStep('choices')}>
            Back to choices
          </button>
        )}
      </div>
    </div>
  )
}

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.2rem 0.55rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: '999px',
  color: 'var(--text)',
  fontSize: '0.74rem',
  background: 'var(--bg-panel)',
} as const

const listButtonStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.8rem',
  width: '100%',
  padding: '0.45rem 0.55rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: '6px',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
  textAlign: 'left',
  cursor: 'pointer',
} as const

const listStyle = {
  margin: 0,
  paddingLeft: '1rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.45,
  fontSize: '0.86rem',
} as const

function formatResourceDelta(deltas: Record<string, number | undefined>): string {
  const values = Object.entries(deltas)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
  return values.length > 0 ? values.join(', ') : 'No resource changes'
}

function formatMetricDelta(deltas: Record<string, number | undefined>): string {
  const values = Object.entries(deltas)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] !== 0)
    .map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`)
  return values.length > 0 ? values.join(', ') : 'No metric changes'
}

function formatTargetLabel(content: ReturnType<typeof useGameStore.getState>['state']['content'], target: ActionTarget): string {
  if (target.zone_id) return resolveZoneName(content, target.zone_id)
  if (target.territory_key) return resolveTerritoryName(content, target.territory_key)
  if (target.actor_key) return resolveActorName(content, target.actor_key)
  return 'N/A'
}

function formatCategoryLabel(category: string): string {
  if (category === 'governance_economic') return 'Governance / Economic'
  if (category === 'community_mediation') return 'Community Mediation'
  return category
    .split('_')
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function formatTokenLabel(value: string): string {
  return value
    .split('_')
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function findDialogueChoiceNode(dialogue: DialogueData): { choices: DialogueChoiceData[] } | undefined {
  const root = dialogue.node_graph.root
  if (root?.next) {
    const linked = dialogue.node_graph[root.next]
    if (linked?.type === 'choice' && linked.choices) {
      return { choices: linked.choices }
    }
  }
  const fallback = Object.values(dialogue.node_graph).find((node) => node?.type === 'choice' && node.choices)
  if (!fallback?.choices) {
    return undefined
  }
  return { choices: fallback.choices }
}

const ALLOCATION_RESOURCE_KEYS: (keyof Resources)[] = [
  'budget',
  'personnel',
  'political_capital',
  'intel_points',
  'time_months',
]

const RESOURCE_LABELS: Record<keyof Resources, string> = {
  budget: 'Budget',
  personnel: 'Personnel',
  political_capital: 'Political Capital',
  intel_points: 'Intel Points',
  time_months: 'Time (Months)',
}

function formatResourceValue(key: keyof Resources, value: number): string {
  if (key === 'budget') {
    return `$${Math.round(value).toLocaleString()}`
  }
  if (key === 'time_months') {
    return `${Math.round(value)} mo`
  }
  return Math.round(value).toLocaleString()
}

function formatResourceSignedValue(key: keyof Resources, value: number): string {
  const sign = value >= 0 ? '+' : '-'
  const abs = Math.abs(value)
  if (key === 'budget') {
    return `${sign}$${Math.round(abs).toLocaleString()}`
  }
  if (key === 'time_months') {
    return `${sign}${Math.round(abs)} mo`
  }
  return `${sign}${Math.round(abs).toLocaleString()}`
}

function buildDefaultAllocation(action: ActionDefinition): Partial<Resources> {
  return {
    budget: action.costs.budget.default,
    personnel: action.costs.personnel.default,
    political_capital: action.costs.political_capital.default,
    intel_points: action.costs.intel_points.default,
    time_months: action.costs.time_months.default,
  }
}

function buildRequestedAllocation(
  action: ActionDefinition,
  draft: Partial<Resources> | null
): Partial<Resources> {
  const fallback = buildDefaultAllocation(action)
  return {
    budget: draft?.budget ?? fallback.budget,
    personnel: draft?.personnel ?? fallback.personnel,
    political_capital: draft?.political_capital ?? fallback.political_capital,
    intel_points: draft?.intel_points ?? fallback.intel_points,
    time_months: draft?.time_months ?? fallback.time_months,
  }
}

interface SelectOption<T extends string> {
  value: T
  label: string
}

function pickPreferredOption<T extends string>(
  preferred: string | null | undefined,
  options: readonly SelectOption<T>[]
): T | undefined {
  if (preferred) {
    const matched = options.find((option) => option.value === preferred)
    if (matched) return matched.value
  }
  return options[0]?.value
}

function ActionConfigBody(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = useGameStore((s) => s.state.content)
  const selectedActionId = useUiStore((s) => s.selectedActionId)
  const selectedTarget = useUiStore((s) => s.selectedTarget)
  const actionFlowStep = useUiStore((s) => s.actionFlowStep)
  const actionAllocation = useUiStore((s) => s.actionAllocation)
  const actionOutcome = useUiStore((s) => s.actionOutcome)
  const selectedZoneId = useUiStore((s) => s.selectedZoneId)
  const selectedTerritoryKey = useUiStore((s) => s.selectedTerritoryKey)
  const selectedActorKey = useUiStore((s) => s.selectedActorKey)
  const setSelectedAction = useUiStore((s) => s.setSelectedAction)
  const setActionFlowStep = useUiStore((s) => s.setActionFlowStep)
  const setActionAllocation = useUiStore((s) => s.setActionAllocation)
  const setActionAllocationValue = useUiStore((s) => s.setActionAllocationValue)
  const setActionOutcome = useUiStore((s) => s.setActionOutcome)
  const closeModal = useUiStore((s) => s.closeModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  if (!content) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading action definitions...</p>
  }

  const actions = content.actions.actions
  if (actions.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actions available.</p>
  }

  const categories = Array.from(new Set(actions.map((item) => item.category)))
  const selectedAction = selectedActionId ? actions.find((item) => item.action_id === selectedActionId) : undefined
  const fallbackAction = actions[0]
  const activeCategory = selectedAction?.category ?? categories[0]
  if (!fallbackAction || !activeCategory) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No actions available.</p>
  }

  const actionsInCategory = actions.filter((item) => item.category === activeCategory)
  const action =
    selectedAction && selectedAction.category === activeCategory
      ? selectedAction
      : (actionsInCategory[0] ?? fallbackAction)
  const actionId = action.action_id

  useEffect(() => {
    setActionAllocation(buildDefaultAllocation(action))
    setActionFlowStep('configure')
    setActionOutcome(null)
  }, [actionId, setActionAllocation, setActionFlowStep, setActionOutcome])

  const zoneState = state.zone_state ?? {}
  const allZones = Object.values(zoneState)
  const territoryOptions: SelectOption<TerritoryKey>[] = Object.values(state.territory_state ?? {}).map((territory) => ({
    value: territory.territory_key,
    label: resolveTerritoryName(content, territory.territory_key),
  }))

  const preferredTerritoryFromZoneSelection = (() => {
    if (selectedTarget?.zone_id) return zoneState[selectedTarget.zone_id]?.territory_key
    if (selectedZoneId) return zoneState[selectedZoneId]?.territory_key
    return undefined
  })()

  const selectedTerritory = pickPreferredOption(
    selectedTarget?.territory_key ?? selectedTerritoryKey ?? preferredTerritoryFromZoneSelection,
    territoryOptions
  )

  const zoneOptions: SelectOption<string>[] = allZones
    .filter((zone) => (selectedTerritory ? zone.territory_key === selectedTerritory : true))
    .map((zone) => ({
      value: zone.zone_id,
      label: resolveZoneName(content, zone.zone_id),
    }))

  const selectedZone = pickPreferredOption(selectedTarget?.zone_id ?? selectedZoneId, zoneOptions)

  const actorPool = action.target_actors && action.target_actors.length > 0
    ? action.target_actors
    : Object.keys(state.actor_sentiments ?? {})

  const actorOptions: SelectOption<string>[] = actorPool.map((actorKey) => ({
    value: actorKey,
    label: resolveActorName(content, actorKey),
  }))

  const selectedActor = pickPreferredOption(selectedTarget?.actor_key ?? selectedActorKey, actorOptions)

  const resolvedTarget: ActionTarget = (() => {
    if (action.target_scope === 'zone') {
      return selectedZone ? { zone_id: selectedZone } : {}
    }
    if (action.target_scope === 'territory') {
      return selectedTerritory ? { territory_key: selectedTerritory } : {}
    }
    return selectedActor ? { actor_key: selectedActor } : {}
  })()

  const handleTerritoryChange = (value: string): void => {
    const matched = territoryOptions.find((option) => option.value === value)
    if (!matched) {
      setSelectedAction(action.action_id, { ...(selectedTarget ?? {}), territory_key: undefined, zone_id: undefined })
      return
    }
    const defaultZoneForTerritory = allZones.find((zone) => zone.territory_key === matched.value)?.zone_id
    setSelectedAction(action.action_id, {
      ...(selectedTarget ?? {}),
      territory_key: matched.value,
      zone_id: defaultZoneForTerritory,
    })
  }

  const handleZoneChange = (value: string): void => {
    const matched = zoneOptions.find((option) => option.value === value)
    if (!matched) {
      setSelectedAction(action.action_id, { ...(selectedTarget ?? {}), zone_id: undefined })
      return
    }
    const zone = zoneState[matched.value]
    setSelectedAction(action.action_id, {
      ...(selectedTarget ?? {}),
      territory_key: zone?.territory_key ?? selectedTerritory,
      zone_id: matched.value,
    })
  }

  const handleActorChange = (value: string): void => {
    const matched = actorOptions.find((option) => option.value === value)
    setSelectedAction(action.action_id, { ...(selectedTarget ?? {}), actor_key: matched?.value })
  }

  const requestedAllocation = buildRequestedAllocation(action, actionAllocation)
  const cost = getResolvedCost(action, requestedAllocation)
  const allocationSpecs = ALLOCATION_RESOURCE_KEYS.map((key) => {
    const range = action.costs[key]
    const available = state.session.resources[key]
    const cappedMax = Math.min(range.max, available)
    const sliderMax = Math.max(range.min, cappedMax)
    const value = Math.min(Math.max(cost[key], range.min), sliderMax)
    const unavailable = cappedMax < range.min
    const fixed = range.max === range.min
    return {
      key,
      label: RESOURCE_LABELS[key],
      min: range.min,
      max: sliderMax,
      step: range.step > 0 ? range.step : 1,
      value,
      available,
      unavailable,
      fixed,
      rangeMax: range.max,
    }
  })

  let validationError: string | null = null
  try {
    validateAction(state, action, resolvedTarget, cost)
  } catch (error: unknown) {
    validationError = error instanceof GameError ? error.message : 'Action cannot be executed with current state.'
  }

  const executeAction = (): void => {
    try {
      const result = executeActionWithLog(state, action, resolvedTarget, requestedAllocation)
      useGameStore.setState({ state: result.state })
      void autosaveState(result.state, 'after_action').catch(() => undefined)
      setActionOutcome(result.logEntry)
      setActionFlowStep('outcome')
    } catch (error: unknown) {
      if (error instanceof GameError) {
        window.alert(`Action failed: ${error.message}`)
        return
      }
      window.alert('Action failed due to an unexpected runtime error.')
    }
  }

  if (actionFlowStep === 'review') {
    return (
      <div className="action-config-layout">
        <div className="action-config-review">
          <div className="action-config-review-row">
            <span>Action</span>
            <strong>{resolveActionName(content, action.action_id)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Category</span>
            <strong>{formatCategoryLabel(action.category)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Target</span>
            <strong>{formatTargetLabel(content, resolvedTarget)}</strong>
          </div>
          {allocationSpecs.map((spec) => (
            <div className="action-config-review-row" key={spec.key}>
              <span>{spec.label}</span>
              <strong>{formatResourceValue(spec.key, cost[spec.key])}</strong>
            </div>
          ))}
        </div>

        {validationError && (
          <div className="action-config-validation">
            {validationError}
          </div>
        )}

        <div className="action-config-review-actions">
          <button
            type="button"
            className="action-config-secondary"
            onClick={() => setActionFlowStep('configure')}
          >
            Back
          </button>
          <button
            type="button"
            className="action-config-confirm"
            onClick={executeAction}
            disabled={validationError !== null}
          >
            Confirm action
          </button>
        </div>
      </div>
    )
  }

  if (actionFlowStep === 'outcome') {
    if (!actionOutcome) {
      return (
        <div className="action-config-layout">
          <p className="action-config-description">Action outcome unavailable.</p>
          <button type="button" className="action-config-confirm" onClick={closeModal}>
            Close
          </button>
        </div>
      )
    }

    return (
      <div className="action-config-layout">
        <div className="action-config-outcome-title">Action executed</div>
        <div className="action-config-review">
          <div className="action-config-review-row">
            <span>Action</span>
            <strong>{resolveActionName(content, actionOutcome.action_id)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Target</span>
            <strong>{formatTargetLabel(content, actionOutcome.target)}</strong>
          </div>
          <div className="action-config-review-row">
            <span>Turn</span>
            <strong>{actionOutcome.turn}</strong>
          </div>
          {ALLOCATION_RESOURCE_KEYS.map((key) => (
            <div className="action-config-review-row" key={key}>
              <span>{RESOURCE_LABELS[key]} delta</span>
              <strong>{formatResourceSignedValue(key, actionOutcome.resource_deltas[key] ?? 0)}</strong>
            </div>
          ))}
          <div className="action-config-review-row">
            <span>Metric changes</span>
            <strong>{formatMetricDelta(actionOutcome.metric_deltas)}</strong>
          </div>
        </div>
        <div className="action-config-review-actions">
          {state.session.actions_remaining > 0 && (
            <button
              type="button"
              className="action-config-secondary"
              onClick={() => {
                setActionOutcome(null)
                setActionFlowStep('configure')
              }}
            >
              Configure next action
            </button>
          )}
          <button type="button" className="action-config-confirm" onClick={closeModal}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="action-config-layout">
      <div className="action-config-grid">
        <label className="action-config-field">
          <span>Category</span>
          <select
            className="action-config-select"
            value={activeCategory}
            onChange={(event) => {
              const nextAction = actions.find((item) => item.category === event.target.value)
              if (!nextAction) return
              setSelectedAction(nextAction.action_id, selectedTarget)
            }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="action-config-field">
          <span>Action</span>
          <select
            className="action-config-select"
            value={action.action_id}
            onChange={(event) => setSelectedAction(event.target.value, selectedTarget)}
          >
            {actionsInCategory.map((item) => (
              <option key={item.action_id} value={item.action_id}>
                {resolveActionName(content, item.action_id)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="action-config-field">
        <span>Territory</span>
        <select
          className="action-config-select"
          value={selectedTerritory ?? ''}
          disabled={territoryOptions.length === 0}
          onChange={(event) => handleTerritoryChange(event.target.value)}
        >
          {territoryOptions.length === 0 ? (
            <option value="">No valid targets available</option>
          ) : (
            territoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="action-config-field">
        <span>Zone</span>
        <select
          className="action-config-select"
          value={selectedZone ?? ''}
          disabled={zoneOptions.length === 0}
          onChange={(event) => handleZoneChange(event.target.value)}
        >
          {zoneOptions.length === 0 ? (
            <option value="">No zones in selected territory</option>
          ) : (
            zoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          )}
        </select>
      </label>

      {action.target_scope === 'actor' && (
        <label className="action-config-field">
          <span>Actor</span>
          <select
            className="action-config-select"
            value={selectedActor ?? ''}
            disabled={actorOptions.length === 0}
            onChange={(event) => handleActorChange(event.target.value)}
          >
            {actorOptions.length === 0 ? (
              <option value="">No valid actors available</option>
            ) : (
              actorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </label>
      )}

      <div className="action-config-resource-grid">
        {allocationSpecs.map((spec) => (
          <div className="action-config-resource" key={spec.key}>
            <div className="action-config-resource-header">
              <span>{spec.label}</span>
              <strong>{formatResourceValue(spec.key, spec.value)}</strong>
            </div>
            <input
              type="range"
              className="action-config-slider"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={spec.value}
              disabled={spec.unavailable || spec.fixed}
              onChange={(event) => setActionAllocationValue(spec.key, Number(event.target.value))}
            />
            <div className="action-config-resource-meta">
              <span>
                Range {formatResourceValue(spec.key, spec.min)} to {formatResourceValue(spec.key, spec.rangeMax)}
              </span>
              <span>Available {formatResourceValue(spec.key, spec.available)}</span>
            </div>
            {spec.unavailable && (
              <div className="action-config-resource-warning">
                Insufficient available {spec.label.toLowerCase()} for this action.
              </div>
            )}
            {spec.fixed && !spec.unavailable && (
              <div className="action-config-resource-fixed">Fixed cost</div>
            )}
          </div>
        ))}
      </div>

      <div className="action-config-summary">
        <div className="action-config-summary-row">
          <span>Category</span>
          <strong>{formatCategoryLabel(action.category)}</strong>
        </div>
        <div className="action-config-summary-row">
          <span>Territory</span>
          <strong>{selectedTerritory ? resolveTerritoryName(content, selectedTerritory) : 'N/A'}</strong>
        </div>
        <div className="action-config-summary-row">
          <span>Zone</span>
          <strong>{selectedZone ? resolveZoneName(content, selectedZone) : 'N/A'}</strong>
        </div>
        <div className="action-config-summary-row">
          <span>Action target</span>
          <strong>{formatTargetLabel(content, resolvedTarget)}</strong>
        </div>
      </div>

      <p className="action-config-description">
        {resolveActionDescription(content, action.action_id)}
      </p>

      <div className="action-config-meta">
        <span className="action-config-chip">Budget -{cost.budget.toLocaleString()}</span>
        <span className="action-config-chip">Personnel -{cost.personnel.toLocaleString()}</span>
        <span className="action-config-chip">Political -{cost.political_capital}</span>
        <span className="action-config-chip">Intel -{cost.intel_points}</span>
        <span className="action-config-chip">Time -{cost.time_months}</span>
      </div>

      {validationError && (
        <div className="action-config-validation">
          {validationError}
        </div>
      )}

      <button
        type="button"
        className="action-config-confirm"
        onClick={() => setActionFlowStep('review')}
        disabled={validationError !== null}
      >
        Review action
      </button>
    </div>
  )
}

const compactButtonStyle = {
  padding: '0.35rem 0.55rem',
  border: '1px solid var(--border-subtle)',
  borderRadius: '4px',
  background: 'var(--bg-panel)',
  color: 'var(--text-secondary)',
  fontSize: '0.74rem',
  cursor: 'pointer',
} as const

function OnboardingLoadingBody(): ReactNode {
  return (
    <div className="onboarding-loading-shell">
      <div className="onboarding-loading-kicker">African Union Command Network</div>
      <div className="onboarding-loading-title">Establishing Theater Link</div>
      <div className="onboarding-loading-subtitle">Calibrating mandate systems and regional intelligence feeds...</div>
      <div className="onboarding-loading-bar">
        <span />
      </div>
      <div className="onboarding-loading-checklist">
        <span>Authenticating guest operations channel</span>
        <span>Syncing Sahel territory telemetry</span>
        <span>Preparing mission command overlays</span>
      </div>
      <div className="onboarding-loading-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function ModalBody(): ReactNode {
  const modal = useUiStore((s) => s.modal)

  if (modal === 'onboarding_loading') return <OnboardingLoadingBody />
  if (modal === 'session_manager') {
    return <SessionManagerBody />
  }
  if (modal === 'action_config') {
    return <ActionConfigBody />
  }
  if (modal === 'territory_overview') return <TerritoryOverviewBody />
  if (modal === 'zone_list') return <ZoneListBody />
  if (modal === 'zone_detail') return <ZoneDetailBody />
  if (modal === 'intel_report') return <IntelReportBody />
  if (modal === 'actor_profile') {
    return <ActorProfileBody />
  }
  if (modal === 'player_profile') return <PlayerProfileBody />
  if (modal === 'dialogue') {
    return <DialogueBody />
  }
  if (modal === 'act_briefing') return <ActBriefingBody />
  if (modal === 'campaign_outcome') return <CampaignOutcomeBody />
  if (modal === 'status_report') return <StatusReportBody />
  if (modal === 'mission_brief') return <MissionBriefBody />
  if (modal === 'leaderboard') {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Leaderboard is deferred in this release scope.</p>
  }
  return null
}

export function ModalRoot(): ReactNode {
  const modal = useUiStore((s) => s.modal)
  const closeModal = useUiStore((s) => s.closeModal)
  const entryGateRequiresChoice = useSessionStore((s) => s.entry_gate_active && !s.entry_gate_confirmed)
  const isBlockingEntryGate = modal === 'session_manager' && entryGateRequiresChoice
  const isBlockingLoading = modal === 'onboarding_loading'
  const isBlockingModal = isBlockingLoading || isBlockingEntryGate
  const backdropStyle = isBlockingModal ? { ...BACKDROP_STYLE, background: '#000' } : BACKDROP_STYLE
  const modalStyle = isBlockingEntryGate
    ? {
        ...MODAL_STYLE,
        width: 'min(560px, 92vw)',
        maxHeight: '90vh',
        overflow: 'hidden',
      }
    : isBlockingLoading
      ? {
          ...MODAL_STYLE,
          width: 'min(640px, 92vw)',
          maxHeight: '88vh',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(10,10,10,0.96), rgba(6,6,6,0.98))',
          border: '1px solid rgba(212, 175, 55, 0.28)',
        }
      : MODAL_STYLE
  const modalContentClassName = `modal-content${isBlockingLoading ? ' modal-content-loading' : ''}${
    isBlockingEntryGate ? ' modal-content-entry-gate' : ''
  }`
  const heading = modal === 'session_manager' && entryGateRequiresChoice ? 'Secure Access' : modalTitle(modal)

  if (modal === 'none') return null

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      style={backdropStyle}
      onClick={(event) => {
        if (isBlockingModal) return
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <div
        className={modalContentClassName}
        style={modalStyle}
        onClick={(event) => event.stopPropagation()}
      >
        {!isBlockingLoading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--gold)', fontSize: '1.25rem' }}>{heading}</h2>
            {!isBlockingModal && (
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                x
              </button>
            )}
          </div>
        )}
        <ModalBody />
      </div>
    </div>
  )
}
