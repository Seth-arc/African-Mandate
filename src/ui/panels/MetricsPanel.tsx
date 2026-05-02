/**
 * Metrics panel: stability, insurgency, civilian_support, global_legitimacy, regional_synergy.
 * Reference pattern: loading, empty, populated. Data from gameStore.
 */
import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import type { Metrics } from '../../state/types'

const METRIC_KEYS: ReadonlyArray<{
  key: keyof Metrics
  label: string
  tooltipId: string
  negative?: boolean
}> = [
  { key: 'stability', label: 'Stability', tooltipId: 'metric.stability' },
  { key: 'insurgency', label: 'Insurgency', tooltipId: 'metric.insurgency', negative: true },
  { key: 'civilian_support', label: 'Civilian support', tooltipId: 'metric.civilian_support' },
  { key: 'global_legitimacy', label: 'Global legitimacy', tooltipId: 'metric.global_legitimacy' },
  { key: 'regional_synergy', label: 'Regional synergy', tooltipId: 'metric.regional_synergy' },
]

export function MetricsPanel(): ReactNode {
  const state = useGameStore((s) => s.state)

  if (!state.session) {
    return (
      <div className="sidebar-panel" id="metrics-panel" data-ui-tooltip="panel.metrics">
        <h2 className="sidebar-panel-title">Regional metrics</h2>
        <p className="game-text-muted">Loading…</p>
      </div>
    )
  }

  const m = state.session.metrics

  return (
    <div className="sidebar-panel" id="metrics-panel" data-ui-tooltip="panel.metrics">
      <h2 className="sidebar-panel-title">Regional metrics</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {METRIC_KEYS.map(({ key, label, tooltipId, negative }) => (
          <MetricBar
            key={key}
            label={label}
            value={m[key]}
            tooltipId={tooltipId}
            negative={negative ?? false}
          />
        ))}
      </div>
    </div>
  )
}

function MetricBar({
  label,
  value,
  tooltipId,
  negative,
}: {
  label: string
  value: number
  tooltipId: string
  negative: boolean
}): ReactNode {
  const pct = Math.max(0, Math.min(100, value))
  const color = negative
    ? (pct >= 75 ? 'var(--alert)' : pct >= 50 ? 'var(--warning)' : 'var(--success)')
    : (pct <= 24 ? 'var(--alert)' : pct <= 49 ? 'var(--warning)' : 'var(--success)')

  return (
    <div data-ui-tooltip={tooltipId}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{value}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '6px',
          borderRadius: '3px',
          background: 'var(--bg-elevated)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
