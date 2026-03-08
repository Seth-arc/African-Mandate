-- Enable UUID generator
create extension if not exists "pgcrypto";

-- ========= PROFILES =========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_read_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ========= GAME SESSIONS =========
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  act int default 1,
  turn int default 1,
  actions_remaining int default 3,
  resources jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  ai_state jsonb not null default '{}'::jsonb,
  current_territory text,
  schema_version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);

alter table public.game_sessions enable row level security;

create policy "sessions_read_own"
on public.game_sessions for select
using (auth.uid() = user_id);

create policy "sessions_insert_own"
on public.game_sessions for insert
with check (auth.uid() = user_id);

create policy "sessions_update_own"
on public.game_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sessions_delete_own"
on public.game_sessions for delete
using (auth.uid() = user_id);

-- ========= ACTIONS LOG =========
create table if not exists public.actions_log (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  turn int not null,
  action_type text not null, -- military / diplomatic / humanitarian / engagement / turn
  title text,
  summary text,
  effects jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_actions_log_session_id on public.actions_log(session_id);

alter table public.actions_log enable row level security;

create policy "actions_read_own"
on public.actions_log for select
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = actions_log.session_id
      and s.user_id = auth.uid()
  )
);

create policy "actions_insert_own"
on public.actions_log for insert
with check (
  exists (
    select 1 from public.game_sessions s
    where s.id = actions_log.session_id
      and s.user_id = auth.uid()
  )
);

create policy "actions_delete_own"
on public.actions_log for delete
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = actions_log.session_id
      and s.user_id = auth.uid()
  )
);

-- ========= ZONE STATE =========
create table if not exists public.zone_state (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  territory_key text not null,
  zone_id text not null,
  insurgency int,
  status text,
  updated_at timestamptz default now()
);

create index if not exists idx_zone_state_session_id on public.zone_state(session_id);

alter table public.zone_state enable row level security;

create policy "zone_read_own"
on public.zone_state for select
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = zone_state.session_id
      and s.user_id = auth.uid()
  )
);

create policy "zone_write_own"
on public.zone_state for insert
with check (
  exists (
    select 1 from public.game_sessions s
    where s.id = zone_state.session_id
      and s.user_id = auth.uid()
  )
);

create policy "zone_update_own"
on public.zone_state for update
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = zone_state.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.game_sessions s
    where s.id = zone_state.session_id
      and s.user_id = auth.uid()
  )
);

-- ========= ACTOR SENTIMENTS =========
create table if not exists public.actor_sentiments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  actor_key text not null,
  sentiment int not null default 50,
  updated_at timestamptz default now()
);

create index if not exists idx_actor_sentiments_session_id on public.actor_sentiments(session_id);

alter table public.actor_sentiments enable row level security;

create policy "sentiments_read_own"
on public.actor_sentiments for select
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = actor_sentiments.session_id
      and s.user_id = auth.uid()
  )
);

create policy "sentiments_write_own"
on public.actor_sentiments for insert
with check (
  exists (
    select 1 from public.game_sessions s
    where s.id = actor_sentiments.session_id
      and s.user_id = auth.uid()
  )
);

create policy "sentiments_update_own"
on public.actor_sentiments for update
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = actor_sentiments.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.game_sessions s
    where s.id = actor_sentiments.session_id
      and s.user_id = auth.uid()
  )
);

-- ========= LEADERBOARD (optional) =========
create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  final_score int not null,
  completed_at timestamptz default now()
);

create index if not exists idx_leaderboard_score on public.leaderboard(final_score desc);

alter table public.leaderboard enable row level security;

create policy "leaderboard_read_all"
on public.leaderboard for select
using (true);

create policy "leaderboard_insert_own"
on public.leaderboard for insert
with check (auth.uid() = user_id);

-- ========= UPDATED_AT TRIGGER (optional) =========
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_game_sessions on public.game_sessions;
create trigger set_updated_at_game_sessions
before update on public.game_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_zone_state on public.zone_state;
create trigger set_updated_at_zone_state
before update on public.zone_state
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_actor_sentiments on public.actor_sentiments;
create trigger set_updated_at_actor_sentiments
before update on public.actor_sentiments
for each row execute function public.set_updated_at();

-- ========= SCHEMA ENRICHMENTS (GAMEPLAY PARITY) =========

-- Helper function to reuse RLS session ownership checks
create or replace function public.is_session_owner(p_session_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_sessions s
    where s.id = p_session_id
      and (
        s.user_id = auth.uid()
        or (s.user_id is null and auth.role() = 'anon')
      )
  );
$$;

-- Allow guest sessions (nullable user_id) + save/load metadata + turn pacing
alter table public.game_sessions
  alter column user_id drop not null;

alter table public.game_sessions
  add column if not exists session_name text,
  add column if not exists slot_index int,
  add column if not exists last_played_at timestamptz default now(),
  add column if not exists max_turns int default 12,
  add column if not exists max_actions int default 3,
  add column if not exists turn_timer_total_seconds int default 900,
  add column if not exists turn_timer_remaining_seconds int default 900,
  add column if not exists intel_layer_state jsonb not null default '{"militia":false,"idp":false,"illicit":false}'::jsonb;

-- Define resource + metric contracts (required keys + bounds)
alter table public.game_sessions
  alter column resources set default '{"budget":0,"politicalCapital":0,"personnel":0,"intelPoints":0,"timeMonths":0}'::jsonb,
  alter column metrics set default '{"stability":0,"insurgency":0,"civilianSupport":0,"globalLegitimacy":0,"regionalSynergy":0}'::jsonb,
  alter column ai_state set default '{"oppositionPressure":0,"intelConfidence":0,"actorSentiments":{}}'::jsonb;

alter table public.game_sessions drop constraint if exists resources_required_keys;
alter table public.game_sessions
  add constraint resources_required_keys
  check (resources ?& array['budget','politicalCapital','personnel','intelPoints','timeMonths']);

alter table public.game_sessions drop constraint if exists resources_bounds;
alter table public.game_sessions
  add constraint resources_bounds
  check (
    jsonb_typeof(resources->'budget') = 'number' and (resources->>'budget')::numeric >= 0 and
    jsonb_typeof(resources->'politicalCapital') = 'number' and (resources->>'politicalCapital')::numeric between 0 and 100 and
    jsonb_typeof(resources->'personnel') = 'number' and (resources->>'personnel')::numeric >= 0 and
    jsonb_typeof(resources->'intelPoints') = 'number' and (resources->>'intelPoints')::numeric between 0 and 99 and
    jsonb_typeof(resources->'timeMonths') = 'number' and (resources->>'timeMonths')::numeric >= 0
  );

alter table public.game_sessions drop constraint if exists metrics_required_keys;
alter table public.game_sessions
  add constraint metrics_required_keys
  check (metrics ?& array['stability','insurgency','civilianSupport','globalLegitimacy','regionalSynergy']);

alter table public.game_sessions drop constraint if exists metrics_bounds;
alter table public.game_sessions
  add constraint metrics_bounds
  check (
    jsonb_typeof(metrics->'stability') = 'number' and (metrics->>'stability')::numeric between 0 and 100 and
    jsonb_typeof(metrics->'insurgency') = 'number' and (metrics->>'insurgency')::numeric between 0 and 100 and
    jsonb_typeof(metrics->'civilianSupport') = 'number' and (metrics->>'civilianSupport')::numeric between 0 and 100 and
    jsonb_typeof(metrics->'globalLegitimacy') = 'number' and (metrics->>'globalLegitimacy')::numeric between 0 and 100 and
    jsonb_typeof(metrics->'regionalSynergy') = 'number' and (metrics->>'regionalSynergy')::numeric between 0 and 100
  );

alter table public.game_sessions drop constraint if exists ai_state_bounds;
alter table public.game_sessions
  add constraint ai_state_bounds
  check (
    jsonb_typeof(ai_state->'oppositionPressure') = 'number' and (ai_state->>'oppositionPressure')::numeric between 0 and 100 and
    jsonb_typeof(ai_state->'intelConfidence') = 'number' and (ai_state->>'intelConfidence')::numeric between 0 and 100
  );

alter table public.game_sessions drop constraint if exists intel_layer_state_keys;
alter table public.game_sessions
  add constraint intel_layer_state_keys
  check (intel_layer_state ?& array['militia','idp','illicit']);

alter table public.game_sessions drop constraint if exists intel_layer_state_types;
alter table public.game_sessions
  add constraint intel_layer_state_types
  check (
    jsonb_typeof(intel_layer_state->'militia') = 'boolean' and
    jsonb_typeof(intel_layer_state->'idp') = 'boolean' and
    jsonb_typeof(intel_layer_state->'illicit') = 'boolean'
  );

alter table public.game_sessions drop constraint if exists turn_bounds;
alter table public.game_sessions
  add constraint turn_bounds
  check (turn >= 1 and (max_turns is null or turn <= max_turns));

alter table public.game_sessions drop constraint if exists actions_remaining_bounds;
alter table public.game_sessions
  add constraint actions_remaining_bounds
  check (actions_remaining >= 0 and (max_actions is null or actions_remaining <= max_actions));

alter table public.game_sessions drop constraint if exists timer_bounds;
alter table public.game_sessions
  add constraint timer_bounds
  check (
    turn_timer_total_seconds >= 0 and
    turn_timer_remaining_seconds >= 0 and
    turn_timer_remaining_seconds <= turn_timer_total_seconds
  );

create index if not exists idx_game_sessions_user_last_played on public.game_sessions(user_id, last_played_at desc);
create index if not exists idx_game_sessions_slot on public.game_sessions(slot_index);

-- Extend actions_log for full action configuration + allocations
alter table public.actions_log
  add column if not exists action_category text,
  add column if not exists action_name text,
  add column if not exists objective text,
  add column if not exists focus_area text,
  add column if not exists target_territories jsonb not null default '[]'::jsonb,
  add column if not exists target_zones jsonb not null default '[]'::jsonb,
  add column if not exists budget_allocated numeric,
  add column if not exists personnel_allocated int,
  add column if not exists time_allocated_months int,
  add column if not exists political_capital_allocated int;

alter table public.actions_log drop constraint if exists actions_budget_nonneg;
alter table public.actions_log
  add constraint actions_budget_nonneg check (budget_allocated is null or budget_allocated >= 0);

alter table public.actions_log drop constraint if exists actions_personnel_nonneg;
alter table public.actions_log
  add constraint actions_personnel_nonneg check (personnel_allocated is null or personnel_allocated >= 0);

alter table public.actions_log drop constraint if exists actions_time_nonneg;
alter table public.actions_log
  add constraint actions_time_nonneg check (time_allocated_months is null or time_allocated_months >= 0);

alter table public.actions_log drop constraint if exists actions_pc_nonneg;
alter table public.actions_log
  add constraint actions_pc_nonneg check (political_capital_allocated is null or political_capital_allocated >= 0);

create index if not exists idx_actions_log_session_turn on public.actions_log(session_id, turn);

-- Territory state (per-session) for UI parity
create table if not exists public.territory_state (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  territory_key text not null,
  name text,
  status text,
  stability int,
  insurgency int,
  population text,
  au_presence text,
  flag_url text,
  latitude numeric,
  longitude numeric,
  coords_label text,
  situation text,
  challenges jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create unique index if not exists ux_territory_state_session_key on public.territory_state(session_id, territory_key);
create index if not exists idx_territory_state_session_id on public.territory_state(session_id);

alter table public.territory_state enable row level security;

create policy "territory_read_own"
on public.territory_state for select
using (public.is_session_owner(session_id));

create policy "territory_write_own"
on public.territory_state for insert
with check (public.is_session_owner(session_id));

create policy "territory_update_own"
on public.territory_state for update
using (public.is_session_owner(session_id))
with check (public.is_session_owner(session_id));

drop trigger if exists set_updated_at_territory_state on public.territory_state;
create trigger set_updated_at_territory_state
before update on public.territory_state
for each row execute function public.set_updated_at();

-- Extend zone_state for full zone details + actor presence
alter table public.zone_state
  add column if not exists name text,
  add column if not exists zone_type text,
  add column if not exists threat_level text,
  add column if not exists population text,
  add column if not exists displaced text,
  add column if not exists description text,
  add column if not exists situation text,
  add column if not exists threats jsonb not null default '[]'::jsonb,
  add column if not exists incidents jsonb not null default '[]'::jsonb,
  add column if not exists image_url text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists coords_label text,
  add column if not exists actors_present jsonb not null default '[]'::jsonb,
  add column if not exists support_actors jsonb not null default '[]'::jsonb;

create unique index if not exists ux_zone_state_session_zone on public.zone_state(session_id, zone_id);

alter table public.zone_state drop constraint if exists zone_insurgency_bounds;
alter table public.zone_state
  add constraint zone_insurgency_bounds
  check (insurgency is null or insurgency between 0 and 100);

-- Enrich actor state: profiles, stance, relationship meter, dialogue options
alter table public.actor_sentiments
  add column if not exists display_name text,
  add column if not exists faction text,
  add column if not exists avatar_url text,
  add column if not exists profile text,
  add column if not exists stance text,
  add column if not exists interests jsonb not null default '[]'::jsonb,
  add column if not exists relationship_score int default 50,
  add column if not exists relationship_label text,
  add column if not exists dialogue_title text,
  add column if not exists dialogue_message text,
  add column if not exists dialogue_context text,
  add column if not exists dialogue_options jsonb not null default '[]'::jsonb,
  add column if not exists dialogue_last_choice text,
  add column if not exists dialogue_state jsonb not null default '{}'::jsonb;

create unique index if not exists ux_actor_sentiments_session_actor on public.actor_sentiments(session_id, actor_key);

alter table public.actor_sentiments drop constraint if exists sentiment_bounds;
alter table public.actor_sentiments
  add constraint sentiment_bounds
  check (sentiment between 0 and 100);

alter table public.actor_sentiments drop constraint if exists relationship_bounds;
alter table public.actor_sentiments
  add constraint relationship_bounds
  check (relationship_score is null or relationship_score between 0 and 100);

-- Dedicated intel persistence: reports + feed items
create table if not exists public.intel_reports (
  id uuid primary key default gen_random_uuid(),
  report_key text not null unique,
  headline text not null,
  subheadline text,
  source text,
  location text,
  threat text,
  urgency text,
  image_url text,
  image_caption text,
  content_html text,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.intel_reports enable row level security;
create policy "intel_reports_read_all"
on public.intel_reports for select
using (true);

create table if not exists public.intel_feed_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  report_key text references public.intel_reports(report_key),
  title text,
  summary text,
  is_urgent boolean default false,
  occurred_at timestamptz,
  is_read boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_intel_feed_session_id on public.intel_feed_items(session_id);
create unique index if not exists ux_intel_feed_session_report on public.intel_feed_items(session_id, report_key);

alter table public.intel_feed_items enable row level security;
create policy "intel_feed_read_own"
on public.intel_feed_items for select
using (public.is_session_owner(session_id));

create policy "intel_feed_write_own"
on public.intel_feed_items for insert
with check (public.is_session_owner(session_id));

create policy "intel_feed_update_own"
on public.intel_feed_items for update
using (public.is_session_owner(session_id))
with check (public.is_session_owner(session_id));

drop trigger if exists set_updated_at_intel_feed on public.intel_feed_items;
create trigger set_updated_at_intel_feed
before update on public.intel_feed_items
for each row execute function public.set_updated_at();

-- Mission brief victory conditions (canonical)
create table if not exists public.scenario_rules (
  id uuid primary key default gen_random_uuid(),
  scenario_key text not null,
  act int default 1,
  min_regional_stability int not null default 70,
  max_insurgency int not null default 35,
  min_civilian_support int not null default 65,
  require_no_critical_zones boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scenario_rules enable row level security;
create policy "scenario_rules_read_all"
on public.scenario_rules for select
using (true);

drop trigger if exists set_updated_at_scenario_rules on public.scenario_rules;
create trigger set_updated_at_scenario_rules
before update on public.scenario_rules
for each row execute function public.set_updated_at();

-- Update session-scoped policies to allow guest sessions
drop policy if exists "sessions_read_own" on public.game_sessions;
create policy "sessions_read_own"
on public.game_sessions for select
using (
  user_id = auth.uid()
  or (user_id is null and auth.role() = 'anon')
);

drop policy if exists "sessions_insert_own" on public.game_sessions;
create policy "sessions_insert_own"
on public.game_sessions for insert
with check (
  user_id = auth.uid()
  or (user_id is null and auth.role() = 'anon')
);

drop policy if exists "sessions_update_own" on public.game_sessions;
create policy "sessions_update_own"
on public.game_sessions for update
using (
  user_id = auth.uid()
  or (user_id is null and auth.role() = 'anon')
)
with check (
  user_id = auth.uid()
  or (user_id is null and auth.role() = 'anon')
);

drop policy if exists "sessions_delete_own" on public.game_sessions;
create policy "sessions_delete_own"
on public.game_sessions for delete
using (
  user_id = auth.uid()
  or (user_id is null and auth.role() = 'anon')
);

drop policy if exists "actions_read_own" on public.actions_log;
create policy "actions_read_own"
on public.actions_log for select
using (public.is_session_owner(session_id));

drop policy if exists "actions_insert_own" on public.actions_log;
create policy "actions_insert_own"
on public.actions_log for insert
with check (public.is_session_owner(session_id));

drop policy if exists "actions_delete_own" on public.actions_log;
create policy "actions_delete_own"
on public.actions_log for delete
using (public.is_session_owner(session_id));

drop policy if exists "zone_read_own" on public.zone_state;
create policy "zone_read_own"
on public.zone_state for select
using (public.is_session_owner(session_id));

drop policy if exists "zone_write_own" on public.zone_state;
create policy "zone_write_own"
on public.zone_state for insert
with check (public.is_session_owner(session_id));

drop policy if exists "zone_update_own" on public.zone_state;
create policy "zone_update_own"
on public.zone_state for update
using (public.is_session_owner(session_id))
with check (public.is_session_owner(session_id));

drop policy if exists "sentiments_read_own" on public.actor_sentiments;
create policy "sentiments_read_own"
on public.actor_sentiments for select
using (public.is_session_owner(session_id));

drop policy if exists "sentiments_write_own" on public.actor_sentiments;
create policy "sentiments_write_own"
on public.actor_sentiments for insert
with check (public.is_session_owner(session_id));

drop policy if exists "sentiments_update_own" on public.actor_sentiments;
create policy "sentiments_update_own"
on public.actor_sentiments for update
using (public.is_session_owner(session_id))
with check (public.is_session_owner(session_id));
