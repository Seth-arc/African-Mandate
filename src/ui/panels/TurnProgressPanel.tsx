import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import {
  resolveActionName,
  resolveActorName,
  resolveTerritoryName,
  resolveZoneName,
} from '../../state/selectors'
import type { Metrics } from '../../state/types'

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

  const hasAnyProgress = latestAction !== null || latestResolvedTurn !== null

  return (
    <div className="sidebar-panel" id="turn-progress-panel">
      <h2 className="sidebar-panel-title">Turn progression</h2>
      <div className="turn-progress-now">
        <span>Turn {session.turn}/{session.max_turns}</span>
        <span>{session.actions_remaining} actions left</span>
      </div>

      {!hasAnyProgress && (
        <p className="game-text-muted" style={{ marginTop: '0.6rem' }}>
          Execute an action and end turn to see progression deltas.
        </p>
      )}

      {latestAction && (
        <div className="turn-progress-block">
          <div className="turn-progress-heading">Latest action</div>
          <div className="turn-progress-line">
            Turn {latestAction.turn}: {resolveActionName(content, latestAction.action_id)}
          </div>
          <div className="turn-progress-line">
            Target: {renderTargetLabel(content, latestAction.target)}
          </div>
        </div>
      )}

      {latestResolvedTurn !== null && latestResolvedMetrics && (
        <div className="turn-progress-block">
          <div className="turn-progress-heading">Latest turn resolution</div>
          <div className="turn-progress-line">Resolved turn {latestResolvedTurn}</div>
          {turnDelta.length === 0 ? (
            <div className="turn-progress-line">No metric changes</div>
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
