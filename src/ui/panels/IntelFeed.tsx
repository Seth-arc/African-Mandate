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
    >
      <button
        type="button"
        className="intel-feed-header"
        onClick={toggle}
      >
        <span className="sidebar-panel-title intel-feed-title">
          <svg
            className="intel-feed-title-icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 8l9 6 9-6" />
          </svg>
          <span>Intelligence Feed</span>
        </span>
        <div className="intel-feed-meta">
          <span className="actor-chip intel-feed-status" aria-label={`${unreadCount} unread`}>
            <span>{unreadCount} unread</span>
            <span className="intel-feed-status-divider" aria-hidden="true" />
            <span className="intel-feed-status-toggle" aria-hidden="true">{minimized ? '+' : '-'}</span>
          </span>
        </div>
      </button>
      {!minimized && (
        <div className="intel-feed-content">
          {intel_feed === undefined && <p className="intel-feed-empty">Loading intelligence briefings...</p>}
          {intel_feed !== undefined && intel_feed.length === 0 && (
            <p className="intel-feed-empty">No briefings filed yet.</p>
          )}
          {intel_feed !== undefined && intel_feed.length > 0 && (
            <ul className="intel-feed-list">
              {intel_feed.map((item) => {
                const report = resolveIntelReport(content, item.report_key)
                const zoneScope = report?.zone_scope ? resolveZoneName(content, report.zone_scope) : 'Regional scope'
                return (
                  <li
                    key={item.report_key}
                    className={`intel-feed-item${item.is_urgent ? ' urgent' : ''}${!item.is_read ? ' unread' : ''}`}
                    onClick={() => handleItemClick(item.report_key)}
                    onKeyDown={(event) => event.key === 'Enter' && handleItemClick(item.report_key)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open briefing ${report?.headline_text ?? item.report_key}`}
                  >
                    <div className="intel-feed-item-topline">
                      <span className="intel-feed-item-kicker">AU D&apos;Marche</span>
                      <div className="intel-feed-item-badges">
                        {item.is_urgent && <span className="actor-chip inactive">Urgent</span>}
                        {!item.is_read && <span className="actor-chip active">New</span>}
                      </div>
                    </div>
                    <div className="intel-feed-item-title">{report?.headline_text ?? item.report_key}</div>
                    {report && (
                      <div className="intel-feed-item-summary">
                        {formatTokenLabel(report.urgency)} urgency | {formatTokenLabel(report.confidence_level)} confidence
                      </div>
                    )}
                    <div className="intel-feed-item-meta">
                      <span>Turn {item.occurred_at}</span>
                      <span className="intel-feed-item-meta-divider" aria-hidden="true" />
                      <span>{zoneScope}</span>
                      <span className="intel-feed-item-meta-divider" aria-hidden="true" />
                      <span>{report ? formatTokenLabel(report.generated_by) : 'Field channel'}</span>
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
