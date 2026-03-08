/**
 * Intel resolution helpers for runtime feed interactions.
 */

import type { GameState } from '../state/types'
import { GameError } from '../state/types'

/**
 * Marks a report as read in state.intel_feed.
 * Throws when the report key is unknown in the runtime feed.
 */
export function markIntelReportRead(state: GameState, reportKey: string): GameState {
  const feed = state.intel_feed
  if (!feed) {
    throw new GameError('Intel feed not initialized', 'INTEL_FEED_NOT_INITIALIZED')
  }

  let found = false
  const nextFeed = feed.map((item) => {
    if (item.report_key !== reportKey) {
      return item
    }
    found = true
    if (item.is_read) {
      return item
    }
    return {
      ...item,
      is_read: true,
    }
  })

  if (!found) {
    throw new GameError(`Intel report not found in feed: ${reportKey}`, 'INTEL_REPORT_NOT_FOUND')
  }

  return {
    ...state,
    intel_feed: nextFeed,
  }
}
