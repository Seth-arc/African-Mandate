export type TelemetryEventName =
  | 'funnel_entry_started'
  | 'funnel_campaign_started'
  | 'funnel_campaign_resumed'
  | 'funnel_onboarding_loading_started'
  | 'campaign_completed'
  | 'campaign_abandoned'
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
  | 'action_validation_failed'
  | 'save_failed'
  | 'autosave_failed'
  | 'accessibility_mode_changed'
  | 'e2e_critical_error'

export const TELEMETRY_MODE = 'local_qa_only'

export interface TelemetryRecord {
  name: TelemetryEventName
  mode: typeof TELEMETRY_MODE
  occurredAtMs: number
  payload: Record<string, unknown>
}

declare global {
  interface Window {
    __africanMandateTelemetry?: TelemetryRecord[]
    __africanMandateTelemetryEnabled?: boolean
  }
}

let telemetryEnabled = false

export function setTelemetryEnabled(enabled: boolean): void {
  telemetryEnabled = enabled
  if (typeof window !== 'undefined') {
    window.__africanMandateTelemetryEnabled = enabled
  }
}

export function isTelemetryEnabled(): boolean {
  if (typeof window !== 'undefined' && typeof window.__africanMandateTelemetryEnabled === 'boolean') {
    return window.__africanMandateTelemetryEnabled
  }
  return telemetryEnabled
}

export function recordTelemetryEvent(
  name: TelemetryEventName,
  payload: Record<string, unknown> = {}
): void {
  if (typeof window === 'undefined' || !isTelemetryEnabled()) return

  const record: TelemetryRecord = {
    name,
    mode: TELEMETRY_MODE,
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
