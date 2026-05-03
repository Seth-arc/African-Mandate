# Telemetry Requirements

## Current Mode

Telemetry is **local QA-only** for the desktop public demo. It is not durable production analytics, is not sent to a remote collector, and is stored only in the browser runtime queue `window.__africanMandateTelemetry` when the player enables Local QA telemetry opt-in.

Every emitted record includes `mode: "local_qa_only"`.

## Required Local QA Events

- Funnel progression: `funnel_entry_started`, `funnel_campaign_started`, `funnel_campaign_resumed`, `funnel_onboarding_loading_started`.
- Action flow: `forecast_card_viewed`, `forecast_confidence_rendered`, `forecast_risk_rendered`, `action_validation_failed`, `action_confirmed_from_review`, `action_cancelled_from_review`.
- Save failures: `save_failed`, `autosave_failed`.
- Completion and abandonment: `campaign_completed`, `campaign_abandoned`.
- Accessibility mode use: `accessibility_mode_changed` for high contrast, reduced motion, and tooltip mode changes.
- E2E-critical errors: `e2e_critical_error` from action/dialogue runtime failures and the React error boundary.
- Turn loop timing: `turn_loop_started`, `turn_loop_completed`, `turn_loop_duration_ms`, `reveal_mode_selected`, `fast_reveal_used`.

## Payload Rules

- Use snake_case payload keys.
- Do not include PII or raw auth tokens.
- Use action ids, dialogue ids, turn numbers, target scope, validation reason, save mode/reason, and bounded UI surface names.
- Final campaign records may include final metrics and resource totals because they are synthetic demo state.

## Production Blocker

Before calling telemetry production-ready, replace the browser queue with a durable, privacy-reviewed analytics pipeline and document retention, transport, access controls, and operator monitoring. Until then, UI copy and docs must continue to call telemetry local QA-only.

## Strategic Score

- `strategic_score = round((stability + global_legitimacy) / 2)`.
- `strategic_score` remains the official leaderboard score.
- `strategic_score_v2_experimental` is optional telemetry-only if implemented later.
