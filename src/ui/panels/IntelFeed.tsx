/**
 * Intel feed panel. Loading, empty, populated. Data from gameStore.state.intel_feed.
 */
import { useState, type ReactNode } from 'react'
import { resolveIntelReport, resolveZoneName } from '../../state/selectors'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'

type IntelFeedFilter = 'all' | 'urgent' | 'normal'

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
  const [activeFilter, setActiveFilter] = useState<IntelFeedFilter>('all')

  const unreadCount = intel_feed?.reduce((count, item) => (item.is_read ? count : count + 1), 0) ?? 0
  const urgentCount = intel_feed?.reduce((count, item) => (item.is_urgent ? count + 1 : count), 0) ?? 0
  const normalCount = (intel_feed?.length ?? 0) - urgentCount
  const filteredFeed = intel_feed?.filter((item) => {
    if (activeFilter === 'urgent') return item.is_urgent
    if (activeFilter === 'normal') return !item.is_urgent
    return true
  }) ?? []
  const emptyMessage =
    activeFilter === 'urgent'
      ? 'No urgent briefings in feed.'
      : activeFilter === 'normal'
        ? 'No normal briefings in feed.'
        : 'No briefings filed yet.'
  const filterOptions: Array<{ key: IntelFeedFilter; label: string; count: number; tooltipId: string }> = [
    { key: 'all', label: 'All', count: intel_feed?.length ?? 0, tooltipId: 'intel.filter.all' },
    { key: 'urgent', label: 'Urgent', count: urgentCount, tooltipId: 'intel.filter.urgent' },
    { key: 'normal', label: 'Normal', count: normalCount, tooltipId: 'intel.filter.normal' },
  ]

  const handleItemClick = (reportKey: string): void => {
    setReportKey(reportKey)
    openModal('intel_report')
  }

  return (
    <div
      className={`intel-feed ${minimized ? 'minimized' : ''}`}
      id="intel-feed"
      data-ui-tooltip="panel.intel_feed"
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
        <p className="sidebar-panel-note">
          Priority briefings, confidence signals, and theater scope for the current mandate.
        </p>
      )}
      {!minimized && (
        <div className="intel-feed-content">
          {intel_feed === undefined && <p className="intel-feed-empty">Loading intelligence briefings...</p>}
          {intel_feed !== undefined && intel_feed.length === 0 && (
            <p className="intel-feed-empty">No briefings filed yet.</p>
          )}
          {intel_feed !== undefined && intel_feed.length > 0 && (
            <>
              <div className="intel-feed-filter-row" role="group" aria-label="Filter intelligence feed">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`intel-feed-filter-btn${activeFilter === option.key ? ' is-active' : ''}`}
                    data-ui-tooltip={option.tooltipId}
                    onClick={() => setActiveFilter(option.key)}
                    aria-pressed={activeFilter === option.key}
                  >
                    <span>{option.label}</span>
                    <span className="intel-feed-filter-count">{option.count}</span>
                  </button>
                ))}
              </div>
              {filteredFeed.length === 0 ? (
                <p className="intel-feed-empty">{emptyMessage}</p>
              ) : (
                <ul className="intel-feed-list">
                  {filteredFeed.map((item) => {
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
                        data-ui-tooltip="intel.item"
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
