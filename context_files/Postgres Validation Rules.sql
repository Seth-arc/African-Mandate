-- game_sessions numeric constraints (jsonb)
alter table public.game_sessions
  add constraint resources_budget_nonneg
  check ((resources->>'budget')::numeric >= 0);

alter table public.game_sessions
  add constraint metrics_bounds
  check (
    (metrics->>'stability')::int between 0 and 100 and
    (metrics->>'insurgency')::int between 0 and 100 and
    (metrics->>'civilianSupport')::int between 0 and 100 and
    (metrics->>'globalLegitimacy')::int between 0 and 100 and
    (metrics->>'regionalSynergy')::int between 0 and 100
  );

alter table public.game_sessions
  add constraint ai_bounds
  check (
    (ai_state->>'oppositionPressure')::int between 0 and 100 and
    (ai_state->>'intelConfidence')::int between 0 and 100
  );

-- zone_state insurgency bounds
alter table public.zone_state
  add constraint zone_insurgency_bounds
  check (insurgency between 0 and 100);

-- actor_sentiments bounds
alter table public.actor_sentiments
  add constraint sentiment_bounds
  check (sentiment between 0 and 100);
