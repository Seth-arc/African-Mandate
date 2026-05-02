Add a real Playwright E2E suite for the full player journey: first launch, onboarding, new campaign, action review, invalid action, action feedback, end turn, save/resume, act transition, ending, keyboard flow, and mobile gate.

Fix the intel gate contract: either make action.intel_gate use resources.intel_points as the docs say, or rename/rewrite the UI/docs so intel_confidence is clearly the gate. Add unit tests for locked/unlocked actions.

Implement risk resolution for effects.risks: apply civilian-harm outcomes through a deterministic rule, record the outcome in the action log, apply metric deltas, and trigger the related media event path.

Enforce authored action conditions: implement a safe condition evaluator for requirements.condition and corruption_risk.condition, reject unsupported conditions at content-load time, and test both supported examples.

Restore or replace missing story assets: add all referenced cutscene videos/posters and missing actor portraits, or update content JSON to point only at shipped assets.

Surface autosave failures in the UI: replace swallowed .catch(() => undefined) paths with visible save-error state, retry controls, and clear “not saved” feedback.

Close the direct-entry onboarding bypass: require session/entry gate confirmation before the game interface is playable, including direct SPA entry.

Complete modal accessibility: add focus trap, focus restoration, correct initial focus, inert/background isolation, and regression tests for keyboard-only navigation.

P1 Major Journey Risks
9. Fix action target UI semantics: only show Territory, Zone, or Actor fields when the selected action actually uses them, and explain target scope in the review step.

Disable or block Review action when validation fails, while keeping the reason visible and actionable.

Align action feedback timing with the design: decide whether consequences resolve after each action or only at end turn, then update engine, UI copy, logs, and docs consistently.

Align AI director behavior with the spec: repeated category use should either add +10 opposition_pressure as documented or the docs/UI should describe the actual event-based counterplay.

Add accessible fallback content for new-campaign onboarding loading: visible text, role="status", timeout fallback, and recovery if media fails or stalls.

Resolve production positioning: decide whether launch is “desktop-only public demo” or “production public game,” then update the demo badge, mobile gate copy, docs, and landing expectations.

Replace window.alert runtime failures with app-native error states for action and dialogue failures.

Add durable production telemetry or explicitly mark telemetry as local QA-only. At minimum track funnel progression, action validation failures, save failures, completion/abandonment, accessibility mode use, and E2E-critical errors.

P2 Hardening
17. Replace concrete Supabase values in .env.example with placeholders or document clearly that the anon key is intentionally public demo infrastructure.

Add static asset validation in CI so missing referenced assets fail before deployment.

Add content contract tests for localization keys, action conditions, target scopes, risk definitions, and cutscene references.

Reconcile dependency/docs drift, especially React 19 in package.json versus repo docs that describe React 18 as the approved stack.

Add production readiness documentation covering launch scope, browser support, desktop/mobile support, save behavior, known limitations, and recovery steps.

Run the final gate only after the above: npm run typecheck, npm run lint, npm test -- --run, npm run build, and npm run test:e2e.





11:06 AM