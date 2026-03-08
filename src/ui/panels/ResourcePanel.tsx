/**
 * Resource panel: budget, political_capital, personnel, intel_points, time_months.
 * Reference pattern: handle loading, empty, populated. Data from gameStore.
 */
import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'

export function ResourcePanel(): ReactNode {
  const state = useGameStore((s) => s.state)

  /* Loading: no session yet (should not happen once app is mounted). */
  if (!state.session) {
    return (
      <div className="sidebar-panel" id="resource-panel">
        <h2 className="sidebar-panel-title">Resources</h2>
        <p className="game-text-muted">Loading…</p>
      </div>
    )
  }

  const r = state.session.resources

  /* Empty: all zero (could show a special state; here we still show zeros). */
  const hasAny = r.budget > 0 || r.political_capital > 0 || r.personnel > 0 || r.intel_points > 0 || r.time_months > 0

  return (
    <div className="sidebar-panel" id="resource-panel">
      <h2 className="sidebar-panel-title">Resources</h2>
      {!hasAny && (
        <p className="game-text-muted" style={{ marginBottom: '0.75rem' }}>
          No resources remaining
        </p>
      )}
      <ul className="resource-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <ResourceItem label="Budget" value={`$${(r.budget / 1_000_000).toFixed(1)}M`} />
        <ResourceItem label="Political capital" value={String(r.political_capital)} />
        <ResourceItem label="Personnel" value={String(r.personnel)} />
        <ResourceItem label="Intel points" value={String(r.intel_points)} />
        <ResourceItem label="Time (months)" value={String(r.time_months)} />
      </ul>
    </div>
  )
}

function ResourceItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <li
      className="resource-item"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.4rem 0',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: '0.875rem',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{value}</span>
    </li>
  )
}
