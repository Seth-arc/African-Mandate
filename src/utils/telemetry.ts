export type TelemetryEventName =
  | 'turn_loop_started'
  | 'turn_loop_completed'
  | 'turn_loop_duration_ms'
  | 'reveal_mode_selected'
  | 'fast_reveal_used'
  | 'modal_opened'
  | 'modal_closed'
  | 'modal_primary_cta_clicked'
  | 'modal_escape_used'
  | 'take_action_state_restored'
  | 'forecast_card_viewed'
  | 'forecast_confidence_rendered'
  | 'forecast_risk_rendered'
  | 'action_confirmed_from_review'
  | 'action_cancelled_from_review'

export interface TelemetryRecord {
  name: TelemetryEventName
  occurredAtMs: number
  payload: Record<string, unknown>
}

declare global {
  interface Window {
    __africanMandateTelemetry?: TelemetryRecord[]
  }
}

export function recordTelemetryEvent(
  name: TelemetryEventName,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined') return

  const record: TelemetryRecord = {
    name,
    occurredAtMs: Date.now(),
    payload,
  }

  const queue = window.__africanMandateTelemetry ?? []
  queue.push(record)
  window.__africanMandateTelemetry = queue

  window.dispatchEvent(
    new CustomEvent('african-mandate:telemetry', {
      detail: record,
    })
  )
}
