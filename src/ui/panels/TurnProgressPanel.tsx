import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import {
  resolveActionName,
  resolveActorName,
  resolveTerritoryName,
  resolveZoneName,
} from '../../state/selectors'
import type { Metrics } from '../../state/types'
import { getActFromTurn } from '../../systems/turnEngine'

const METRIC_LABELS: Record<keyof Metrics, string> = {
  stability: 'Stability',
  insurgency: 'Insurgency',
  civilian_support: 'Civilian support',
  global_legitimacy: 'Global legitimacy',
  regional_synergy: 'Regional synergy',
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`
}

function renderTargetLabel(
  content: ReturnType<typeof useGameStore.getState>['state']['content'],
  target: { zone_id?: string; territory_key?: string; actor_key?: string }
): string {
  if (target.zone_id) return resolveZoneName(content, target.zone_id)
  if (target.territory_key) return resolveTerritoryName(content, target.territory_key)
  if (target.actor_key) return resolveActorName(content, target.actor_key)
  return 'N/A'
}

function metricDeltaSummary(previous: Metrics, current: Metrics): string[] {
  const entries: string[] = []
  for (const key of Object.keys(METRIC_LABELS) as (keyof Metrics)[]) {
    const delta = current[key] - previous[key]
    if (delta !== 0) {
      entries.push(`${METRIC_LABELS[key]} ${signed(delta)}`)
    }
  }
  return entries
}

export function TurnProgressPanel(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = state.content
  const session = state.session

  if (!session) {
    return (
      <div className="sidebar-panel" id="turn-progress-panel">
        <h2 className="sidebar-panel-title">Turn progression</h2>
        <p className="game-text-muted">Loading...</p>
      </div>
    )
  }

  const actionLog = state.action_log ?? []
  const latestAction = actionLog.length > 0 ? actionLog[actionLog.length - 1] : null
  const history = state.metric_history ?? {}
  const resolvedTurns = Object.keys(history)
    .map((key) => Number(key))
    .filter((turn) => Number.isFinite(turn))
  const latestResolvedTurn = resolvedTurns.length > 0 ? Math.max(...resolvedTurns) : null

  const latestResolvedMetrics = latestResolvedTurn !== null ? history[latestResolvedTurn] : undefined
  const baselineMetrics =
    latestResolvedTurn !== null && latestResolvedTurn > 1
      ? history[latestResolvedTurn - 1] ?? state.config.starting_metrics
      : state.config.starting_metrics
  const turnDelta =
    latestResolvedMetrics !== undefined ? metricDeltaSummary(baselineMetrics, latestResolvedMetrics) : []
  const act = getActFromTurn(session.turn)

  const hasAnyProgress = latestAction !== null || latestResolvedTurn !== null

  return (
    <div className="sidebar-panel" id="turn-progress-panel">
      <h2 className="sidebar-panel-title">Turn progression</h2>
      <div className="turn-progress-now">
        <div className="turn-progress-now-item">
          <span className="turn-progress-now-label">Act</span>
          <strong className="turn-progress-now-value">{act}</strong>
        </div>
        <div className="turn-progress-now-item">
          <span className="turn-progress-now-label">Turn</span>
          <strong className="turn-progress-now-value">
            {session.turn}/{session.max_turns}
          </strong>
        </div>
        <div className="turn-progress-now-item turn-progress-now-item--actions">
          <span className="turn-progress-now-label">Actions</span>
          <strong className="turn-progress-now-value">{session.actions_remaining} left</strong>
        </div>
      </div>

      {!hasAnyProgress && (
        <p className="turn-progress-empty">
          Execute an action and end turn to see progression deltas.
        </p>
      )}

      {latestAction && (
        <div className="turn-progress-block">
          <div className="turn-progress-heading">Latest action</div>
          <div className="turn-progress-line">
            <span className="turn-progress-line-key">Turn</span>
            <span className="turn-progress-line-value">{latestAction.turn}</span>
          </div>
          <div className="turn-progress-line turn-progress-line--stacked">
            <span className="turn-progress-line-key">Action</span>
            <span className="turn-progress-line-value">{resolveActionName(content, latestAction.action_id)}</span>
          </div>
          <div className="turn-progress-line turn-progress-line--stacked">
            <span className="turn-progress-line-key">Target</span>
            <span className="turn-progress-line-value">{renderTargetLabel(content, latestAction.target)}</span>
          </div>
        </div>
      )}

      {latestResolvedTurn !== null && latestResolvedMetrics && (
        <div className="turn-progress-block">
          <div className="turn-progress-heading">Latest turn resolution</div>
          <div className="turn-progress-line">
            <span className="turn-progress-line-key">Resolved turn</span>
            <span className="turn-progress-line-value">{latestResolvedTurn}</span>
          </div>
          {turnDelta.length === 0 ? (
            <div className="turn-progress-line">
              <span className="turn-progress-line-key">Metrics</span>
              <span className="turn-progress-line-value">No changes</span>
            </div>
          ) : (
            <ul className="turn-progress-list">
              {turnDelta.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
