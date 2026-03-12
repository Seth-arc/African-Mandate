import type { ActiveEventState, GameState } from '../state/types'

export type OperationalPressureLevel = 'steady' | 'elevated' | 'high' | 'critical'

export interface OperationalPressureSnapshot {
  score: number
  level: OperationalPressureLevel
  label: string
  summary: string
  turnsRemaining: number
  timeMonthsRemaining: number
  criticalZoneCount: number
  runtimeCriticalZoneCount: number
  intelCriticalZoneAdditions: number
  activeUrgentIntelCount: number
  oppositionPressure: number
  nearestDeadlineTurn: number | null
  turnsToDeadline: number | null
}

interface IntelPressureSignals {
  activeUrgentIntelCount: number
  activeCriticalIntelCount: number
  activeNonScopedUrgentCount: number
  intelCriticalZoneAdditions: number
  effectiveCriticalZoneCount: number
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function upcomingDeadlineEvents(activeEvents: ActiveEventState[] | undefined): ActiveEventState[] {
  return (activeEvents ?? [])
    .filter((event): event is ActiveEventState & { deadline_turn: number } =>
      event.status === 'active' && event.deadline_turn !== null
    )
    .sort((a, b) => a.deadline_turn - b.deadline_turn)
}

function resolvePressureLevel(score: number): OperationalPressureLevel {
  if (score >= 78) return 'critical'
  if (score >= 58) return 'high'
  if (score >= 38) return 'elevated'
  return 'steady'
}

function resolvePressureSummary(
  level: OperationalPressureLevel,
  criticalZoneCount: number,
  runtimeCriticalZoneCount: number,
  activeUrgentIntelCount: number,
  intelCriticalZoneAdditions: number,
  turnsRemaining: number,
  turnsToDeadline: number | null
): string {
  if (turnsToDeadline !== null && turnsToDeadline <= 0) {
    return 'A tracked deadline is due now. Resolve it this turn or absorb the penalty cascade.'
  }

  if (turnsToDeadline !== null && turnsToDeadline === 1) {
    return 'A deadline expires next turn. Prioritize containment and compliance actions now.'
  }

  if (activeUrgentIntelCount >= 2) {
    return 'Multiple urgent intelligence updates signal fresh instability. Reprioritize before escalation compounds.'
  }

  if (activeUrgentIntelCount === 1) {
    return 'Urgent intelligence indicates a fresh pressure spike. Adjust posture before opposition momentum hardens.'
  }

  if (level === 'critical' || criticalZoneCount >= 3) {
    return 'Mandate stability is near breaking point. Immediate high-impact action is required.'
  }

  if (runtimeCriticalZoneCount === 0 && intelCriticalZoneAdditions > 0) {
    return 'Intel hotspots are emerging despite no confirmed critical zones. Probe and contain early to prevent cascade.'
  }

  if (turnsRemaining <= 3) {
    return 'Endgame phase is active. Every decision now has outsized strategic consequences.'
  }

  if (level === 'high') {
    return 'Adversarial momentum is building. Maintain tempo and prevent multi-zone escalation.'
  }

  if (level === 'elevated') {
    return 'Pressure is rising across the theater. Keep operations synchronized to avoid drift.'
  }

  return 'Window is still open, but pressure compounds each turn. Plan two steps ahead.'
}

export function formatDeadlineSignal(turnsToDeadline: number | null, nearestDeadlineTurn: number | null): string {
  if (turnsToDeadline === null || nearestDeadlineTurn === null) return 'No active hard deadlines'
  if (turnsToDeadline <= 0) return `Deadline due this turn (${nearestDeadlineTurn})`
  if (turnsToDeadline === 1) return `Deadline in 1 turn (${nearestDeadlineTurn})`
  return `Deadline in ${turnsToDeadline} turns (${nearestDeadlineTurn})`
}

function deriveIntelPressureSignals(state: GameState, runtimeCriticalZoneIds: Set<string>): IntelPressureSignals {
  const reports = state.content?.intel_reports.intel_reports
  const feed = state.intel_feed
  if (!reports || reports.length === 0 || !feed || feed.length === 0) {
    return {
      activeUrgentIntelCount: 0,
      activeCriticalIntelCount: 0,
      activeNonScopedUrgentCount: 0,
      intelCriticalZoneAdditions: 0,
      effectiveCriticalZoneCount: runtimeCriticalZoneIds.size,
    }
  }

  const reportByKey = new Map(reports.map((report) => [report.report_key, report] as const))
  const scopedHotZones = new Set<string>()
  let activeUrgentIntelCount = 0
  let activeCriticalIntelCount = 0
  let activeNonScopedUrgentCount = 0

  for (const item of feed) {
    const report = reportByKey.get(item.report_key)
    if (!report) continue

    const turnsUntilExpiry = item.occurred_at + report.expiry_turns - state.session.turn
    if (turnsUntilExpiry < 0) continue

    const urgency = report.urgency.toLowerCase()
    const isCritical = urgency === 'critical'
    const isHigh = urgency === 'high'
    const isUrgent = item.is_urgent || isCritical || isHigh
    if (!isUrgent) continue

    activeUrgentIntelCount += 1
    if (isCritical) activeCriticalIntelCount += 1

    if (report.zone_scope) {
      scopedHotZones.add(report.zone_scope)
    } else {
      activeNonScopedUrgentCount += 1
    }
  }

  const effectiveCriticalZoneIds = new Set(runtimeCriticalZoneIds)
  let intelCriticalZoneAdditions = 0
  for (const zoneId of scopedHotZones) {
    if (!effectiveCriticalZoneIds.has(zoneId)) {
      intelCriticalZoneAdditions += 1
      effectiveCriticalZoneIds.add(zoneId)
    }
  }

  return {
    activeUrgentIntelCount,
    activeCriticalIntelCount,
    activeNonScopedUrgentCount,
    intelCriticalZoneAdditions,
    effectiveCriticalZoneCount: effectiveCriticalZoneIds.size,
  }
}

export function deriveOperationalPressure(state: GameState): OperationalPressureSnapshot {
  const runtimeCriticalZoneIds = new Set(
    Object.values(state.zone_state ?? {})
      .filter((zone) => zone.threat_level >= 75)
      .map((zone) => zone.zone_id)
  )
  const runtimeCriticalZoneCount = runtimeCriticalZoneIds.size
  const intelSignals = deriveIntelPressureSignals(state, runtimeCriticalZoneIds)
  const criticalZoneCount = intelSignals.effectiveCriticalZoneCount
  const turnsRemaining = Math.max(0, state.session.max_turns - state.session.turn + 1)
  const timeMonthsRemaining = Math.max(0, state.session.resources.time_months)
  const oppositionPressure = clampPercent(state.session.ai_state.opposition_pressure)
  const insurgency = clampPercent(state.session.metrics.insurgency)

  const totalTurns = Math.max(1, state.session.max_turns)
  const totalTimeMonths = Math.max(1, state.config.starting_resources.time_months)
  const turnProgressRatio = totalTurns <= 1 ? 1 : (state.session.turn - 1) / (totalTurns - 1)
  const timeSpentRatio = 1 - timeMonthsRemaining / totalTimeMonths

  const nextDeadline = upcomingDeadlineEvents(state.active_events)[0]
  const nearestDeadlineTurn = nextDeadline?.deadline_turn ?? null
  const turnsToDeadline = nearestDeadlineTurn === null ? null : nearestDeadlineTurn - state.session.turn
  const deadlinePressure =
    turnsToDeadline === null
      ? 0
      : turnsToDeadline <= 0
        ? 26
        : turnsToDeadline === 1
          ? 20
          : turnsToDeadline === 2
            ? 14
            : turnsToDeadline === 3
              ? 9
              : 4

  const zonePressure = Math.min(34, criticalZoneCount * 11)
  const intelPressure = Math.min(
    12,
    intelSignals.activeNonScopedUrgentCount * 3 + intelSignals.activeCriticalIntelCount * 2
  )
  const weightedScore =
    zonePressure +
    intelPressure +
    oppositionPressure * 0.24 +
    insurgency * 0.2 +
    timeSpentRatio * 12 +
    turnProgressRatio * 10 +
    deadlinePressure
  const score = clampPercent(weightedScore)
  const level = resolvePressureLevel(score)
  const label = level === 'critical'
    ? 'Critical'
    : level === 'high'
      ? 'Severe'
      : level === 'elevated'
        ? 'Elevated'
        : 'Steady'

  return {
    score,
    level,
    label,
    summary: resolvePressureSummary(
      level,
      criticalZoneCount,
      runtimeCriticalZoneCount,
      intelSignals.activeUrgentIntelCount,
      intelSignals.intelCriticalZoneAdditions,
      turnsRemaining,
      turnsToDeadline
    ),
    turnsRemaining,
    timeMonthsRemaining,
    criticalZoneCount,
    runtimeCriticalZoneCount,
    intelCriticalZoneAdditions: intelSignals.intelCriticalZoneAdditions,
    activeUrgentIntelCount: intelSignals.activeUrgentIntelCount,
    oppositionPressure,
    nearestDeadlineTurn,
    turnsToDeadline,
  }
}
