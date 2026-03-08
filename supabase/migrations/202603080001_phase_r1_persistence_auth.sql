-- Phase R1 persistence/auth migration
-- Mirrors game/supabase/supabase.sql canonical schema.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_name text,
  turn int not null default 1,
  actions_remaining int not null default 3,
  max_turns int not null default 20,
  resources jsonb not null default '{"budget":0,"political_capital":0,"personnel":0,"intel_points":0,"time_months":48}'::jsonb,
  metrics jsonb not null default '{"stability":0,"insurgency":0,"civilian_support":0,"global_legitimacy":0,"regional_synergy":0}'::jsonb,
  ai_state jsonb not null default '{"opposition_pressure":0,"intel_confidence":50}'::jsonb,
  intel_layer_state jsonb not null default '{"militia":false,"idp":false,"illicit":false}'::jsonb,
  state_snapshot jsonb not null default '{}'::jsonb,
  schema_version int not null default 20,
  last_played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sessions_turn_bounds
    check (turn >= 1 and turn <= max_turns),
  constraint game_sessions_actions_remaining_bounds
    check (actions_remaining >= 0 and actions_remaining <= 3),
  constraint game_sessions_resources_required_keys
    check (resources ?& array['budget','political_capital','personnel','intel_points','time_months']),
  constraint game_sessions_metrics_required_keys
    check (metrics ?& array['stability','insurgency','civilian_support','global_legitimacy','regional_synergy']),
  constraint game_sessions_ai_state_required_keys
    check (ai_state ?& array['opposition_pressure','intel_confidence']),
  constraint game_sessions_intel_layer_state_keys
    check (intel_layer_state ?& array['militia','idp','illicit']),
  constraint game_sessions_resources_bounds
    check (
      jsonb_typeof(resources->'budget') = 'number' and (resources->>'budget')::numeric >= 0 and
      jsonb_typeof(resources->'political_capital') = 'number' and (resources->>'political_capital')::numeric between 0 and 100 and
      jsonb_typeof(resources->'personnel') = 'number' and (resources->>'personnel')::numeric >= 0 and
      jsonb_typeof(resources->'intel_points') = 'number' and (resources->>'intel_points')::numeric between 0 and 100 and
      jsonb_typeof(resources->'time_months') = 'number' and (resources->>'time_months')::numeric >= 0
    ),
  constraint game_sessions_metrics_bounds
    check (
      jsonb_typeof(metrics->'stability') = 'number' and (metrics->>'stability')::numeric between 0 and 100 and
      jsonb_typeof(metrics->'insurgency') = 'number' and (metrics->>'insurgency')::numeric between 0 and 100 and
      jsonb_typeof(metrics->'civilian_support') = 'number' and (metrics->>'civilian_support')::numeric between 0 and 100 and
      jsonb_typeof(metrics->'global_legitimacy') = 'number' and (metrics->>'global_legitimacy')::numeric between 0 and 100 and
      jsonb_typeof(metrics->'regional_synergy') = 'number' and (metrics->>'regional_synergy')::numeric between 0 and 100
    ),
  constraint game_sessions_ai_state_bounds
    check (
      jsonb_typeof(ai_state->'opposition_pressure') = 'number' and (ai_state->>'opposition_pressure')::numeric between 0 and 100 and
      jsonb_typeof(ai_state->'intel_confidence') = 'number' and (ai_state->>'intel_confidence')::numeric between 0 and 100
    ),
  constraint game_sessions_intel_layer_state_types
    check (
      jsonb_typeof(intel_layer_state->'militia') = 'boolean' and
      jsonb_typeof(intel_layer_state->'idp') = 'boolean' and
      jsonb_typeof(intel_layer_state->'illicit') = 'boolean'
    )
);

create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);
create index if not exists idx_game_sessions_user_last_played on public.game_sessions(user_id, last_played_at desc);

drop trigger if exists set_updated_at_game_sessions on public.game_sessions;
create trigger set_updated_at_game_sessions
before update on public.game_sessions
for each row execute function public.set_updated_at();

alter table public.game_sessions enable row level security;

drop policy if exists "sessions_read_own" on public.game_sessions;
create policy "sessions_read_own"
on public.game_sessions for select
using (user_id = auth.uid());

drop policy if exists "sessions_insert_own" on public.game_sessions;
create policy "sessions_insert_own"
on public.game_sessions for insert
with check (user_id = auth.uid());

drop policy if exists "sessions_update_own" on public.game_sessions;
create policy "sessions_update_own"
on public.game_sessions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "sessions_delete_own" on public.game_sessions;
create policy "sessions_delete_own"
on public.game_sessions for delete
using (user_id = auth.uid());

create or replace function public.is_session_owner(p_session_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_sessions s
    where s.id = p_session_id
      and s.user_id = auth.uid()
  );
$$;

create table if not exists public.actions_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  turn int not null,
  action_id text not null,
  action_name text,
  action_category text,
  targets jsonb not null default '{}'::jsonb,
  costs jsonb not null default '{}'::jsonb,
  effects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_actions_log_session_id on public.actions_log(session_id);
create index if not exists idx_actions_log_session_turn on public.actions_log(session_id, turn);

alter table public.actions_log enable row level security;

drop policy if exists "actions_read_own" on public.actions_log;
create policy "actions_read_own"
on public.actions_log for select
using (public.is_session_owner(session_id));

drop policy if exists "actions_insert_own" on public.actions_log;
create policy "actions_insert_own"
on public.actions_log for insert
with check (public.is_session_owner(session_id));

drop policy if exists "actions_update_own" on public.actions_log;
create policy "actions_update_own"
on public.actions_log for update
using (public.is_session_owner(session_id))
with check (public.is_session_owner(session_id));

drop policy if exists "actions_delete_own" on public.actions_log;
create policy "actions_delete_own"
on public.actions_log for delete
using (public.is_session_owner(session_id));

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  strategic_score int not null check (strategic_score >= 0),
  completed_at timestamptz not null default now()
);

create index if not exists idx_leaderboard_score on public.leaderboard(strategic_score desc);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard_read_all" on public.leaderboard;
create policy "leaderboard_read_all"
on public.leaderboard for select
using (true);

drop policy if exists "leaderboard_insert_own" on public.leaderboard;
create policy "leaderboard_insert_own"
on public.leaderboard for insert
with check (user_id = auth.uid());
