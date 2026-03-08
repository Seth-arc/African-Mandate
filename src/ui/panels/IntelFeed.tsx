/**
 * Intel feed panel. Loading, empty, populated. Data from gameStore.state.intel_feed.
 */
import type { ReactNode } from 'react'
import { resolveIntelReport, resolveZoneName } from '../../state/selectors'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'

function formatTokenLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function IntelFeed(): ReactNode {
  const intel_feed = useGameStore((s) => s.state.intel_feed)
  const content = useGameStore((s) => s.state.content)
  const minimized = useUiStore((s) => s.intelFeedMinimized)
  const toggle = useUiStore((s) => s.toggleIntelFeed)
  const setReportKey = useUiStore((s) => s.setSelectedReportKey)
  const openModal = useUiStore((s) => s.openModal)

  const unreadCount = intel_feed?.reduce((count, item) => (item.is_read ? count : count + 1), 0) ?? 0

  const handleItemClick = (reportKey: string): void => {
    setReportKey(reportKey)
    openModal('intel_report')
  }

  return (
    <div
      className={`intel-feed ${minimized ? 'minimized' : ''}`}
      id="intel-feed"
      style={{ marginBottom: '1.5rem' }}
    >
      <button
        type="button"
        className="intel-feed-header"
        onClick={toggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '0.75rem',
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        <span className="sidebar-panel-title" style={{ marginBottom: 0 }}>
          Intelligence feed
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="actor-chip">{unreadCount} unread</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{minimized ? '+' : '-'}</span>
        </div>
      </button>
      {!minimized && (
        <div className="intel-feed-content">
          {intel_feed === undefined && <p className="game-text-muted">Loading...</p>}
          {intel_feed !== undefined && intel_feed.length === 0 && (
            <p className="game-text-muted">No intel reports yet.</p>
          )}
          {intel_feed !== undefined && intel_feed.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {intel_feed.map((item) => {
                const report = resolveIntelReport(content, item.report_key)
                const zoneScope = report?.zone_scope ? resolveZoneName(content, report.zone_scope) : 'Regional scope'
                return (
                  <li
                    key={item.report_key}
                    className={`intel-item ${item.is_urgent ? 'urgent' : ''}`}
                    style={{
                      background: 'var(--bg-card)',
                      borderLeft: `3px solid ${item.is_urgent ? 'var(--alert)' : 'var(--gold)'}`,
                      padding: '0.75rem',
                      marginBottom: '0.6rem',
                      borderRadius: '0 4px 4px 0',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '0.35rem',
                    }}
                    onClick={() => handleItemClick(item.report_key)}
                    onKeyDown={(event) => event.key === 'Enter' && handleItemClick(item.report_key)}
                    role="button"
                    tabIndex={0}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ color: 'var(--gold)' }}>{report?.headline_text ?? item.report_key}</strong>
                      {item.is_urgent && (
                        <span style={{ color: 'var(--alert)', fontSize: '0.72rem', fontWeight: 700 }}>Urgent</span>
                      )}
                      {!item.is_read && (
                        <span style={{ color: 'var(--gold-bright)', fontSize: '0.72rem', fontWeight: 700 }}>New</span>
                      )}
                    </div>
                    {report && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                        {formatTokenLabel(report.urgency)} urgency | {formatTokenLabel(report.confidence_level)} confidence
                      </div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      Turn {item.occurred_at} | {zoneScope}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
