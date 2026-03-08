/**
 * Game state and data types. Aligned with game_config.json, REQUIRED_KEYS_AND_CONSTRAINTS,
 * and content packs in src/data (JSON + events.yaml).
 * All metrics 0–100; all resources >= 0.
 */

// ---------------------------------------------------------------------------
// Core session and config
// ---------------------------------------------------------------------------

export interface Resources {
  budget: number
  political_capital: number
  personnel: number
  intel_points: number
  time_months: number
}

export interface Metrics {
  stability: number
  insurgency: number
  civilian_support: number
  global_legitimacy: number
  regional_synergy: number
}

export interface AiState {
  opposition_pressure: number
  intel_confidence: number
}

export type OversightLevel = 'none' | 'basic' | 'strong'
export type AuditStatus = 'none' | 'pending' | 'passed' | 'failed'

export interface OversightLevelState {
  level: OversightLevel
  set_on_turn: number
}

export interface AuditStatusState {
  status: AuditStatus
  set_on_turn: number | null
}

export type CorruptionFlagStatus = 'active' | 'resolved'

export interface CorruptionFlagState {
  status: CorruptionFlagStatus
  created_turn: number
}

export interface GameSession {
  turn: number
  actions_remaining: number
  max_turns: number
  resources: Resources
  metrics: Metrics
  ai_state: AiState
  /** Last turn (1-based) each action_id was used. For cooldown validation. */
  action_last_used_turn?: Record<string, number>
}

/** Full game state contract. */
export interface GameState {
  session: GameSession
  /** Loaded from game_config at init. */
  config: GameConfig
  /** Content data loaded from JSON at startup. */
  content?: GameContent
  /** Per-session territory state. Keyed by territory_key. */
  territory_state?: Record<TerritoryKey, TerritoryState>
  /** Per-session zone state. Keyed by zone_id. */
  zone_state?: Record<string, ZoneState>
  /** Per-session actor sentiments. Keyed by actor_key. */
  actor_sentiments?: Record<string, ActorSentiment>
  /** Intel feed items for the session. */
  intel_feed?: IntelFeedItem[]
  /** Narrative flags set by actions/events. For requirements.flags_required checks. */
  narrative_flags?: Record<string, boolean>
  /** First turn each narrative flag was set. */
  narrative_flag_turns?: Record<string, number>
  /** Runtime oversight level used by corruption/event rules. */
  oversight_level?: OversightLevelState
  /** Runtime audit status used by corruption/event rules. */
  audit_status?: AuditStatusState
  /** Runtime corruption flag registry used by trigger DSL accessors. */
  corruption_flags?: Record<string, CorruptionFlagState>
  /** Active event instances for unresolved/deadline tracking. */
  active_events?: ActiveEventState[]
  /** Runtime event log entries for status/report surfaces. */
  event_log?: EventLogEntry[]
  /** Queued delayed effects; resolve when turn >= turn_due. */
  delayed_effects?: DelayedEffect[]
  /** End-of-turn metrics by turn (1-based). For 3-turn streak and T19/T20 evaluation. */
  metric_history?: Record<number, Metrics>
  /** Action execution history for status reporting. */
  action_log?: ActionLogEntry[]
  /** Metrics at end of turn 19 (set when advancing 19→20). For ending evaluation. */
  metric_snapshot_turn_19?: Metrics
  /** Zone threat_level by zone_id at end of turn 19. For critical zone persistence. */
  zone_threat_snapshot_turn_19?: Record<string, number>
  /** Set when campaign ends. */
  ending_type?: EndingType
  /** Reason for mandate_revoked (time_expiry, critical_streak, etc.). */
  fail_reason?: string
}

/** Queued effect to apply at turn_due. From actions with delay_turns. */
export interface DelayedEffect {
  turn_due: number
  metrics?: Partial<Metrics>
  resources?: Partial<Resources>
  ai_state?: Partial<AiState>
}

/** WIN_LOSS_SCORING_SPEC ending_type. */
export type EndingType =
  | 'strategic_success'
  | 'fragile_success'
  | 'stalemate'
  | 'regional_setback'
  | 'mandate_revoked'

/** Minimal config shape from game_config.json for runtime. */
export interface GameConfig {
  total_turns: number
  action_slots_per_turn: number
  starting_resources: Resources
  starting_metrics: Metrics
  starting_ai_state: AiState
  win_conditions: Record<string, { operator: string; value: number }>
  critical_thresholds: Record<string, { low?: number; high?: number }>
  /** Used when action omits cooldown_turns. From game_config.default_action_cooldown_turns. */
  default_action_cooldown_turns?: number
  /** Used when action omits intel_gate. From game_config.default_intel_gate. */
  default_intel_gate?: number
  /** Months consumed per turn (1-based index). From game_config.turn_duration_months. */
  turn_duration_months?: number[]
}

// ---------------------------------------------------------------------------
// Territories (content + runtime state)
// ---------------------------------------------------------------------------

/** Unique territory keys. Must match territories.json territory_key values. */
export type TerritoryKey =
  | 'mali'
  | 'burkina_faso'
  | 'niger'
  | 'chad'
  | 'mauritania'

/** Lat/lon. Used by territory and zone coords. */
export interface Coords {
  lat: number
  lon: number
}

/** Base metrics for a territory (0–100). From territories.json base_metrics. */
export interface TerritoryBaseMetrics {
  stability: number
  insurgency: number
  civilian_support: number
}

/** One territory from territories.json (content data). */
export interface TerritoryData {
  territory_key: TerritoryKey
  name_key: string
  population: number
  coords: Coords
  base_metrics: TerritoryBaseMetrics
  flag_url: string
  capital?: string
  region?: string
}

/** Wrapper for territories.json. */
export interface TerritoriesContent {
  version: string
  schema_version: string
  updated_at: string
  territories: TerritoryData[]
}

/** Threat/status bands: Low 0–24, Moderate 25–49, High 50–74, Critical 75–100. */
export type TerritoryStatus = 'low' | 'moderate' | 'high' | 'critical'

/** Per-session territory state. RUNTIME_DATA_REQUIREMENTS territory_state. */
export interface TerritoryState {
  territory_key: TerritoryKey
  name: string
  stability: number
  insurgency: number
  status: TerritoryStatus
  population: number
  au_presence?: number
  coords: Coords
}

// ---------------------------------------------------------------------------
// Zones (content + runtime state)
// ---------------------------------------------------------------------------

/** One zone from zones.json (content data). */
export interface ZoneData {
  zone_id: string
  territory_key: TerritoryKey
  name_key: string
  zone_type: string
  population: number
  base_insurgency: number
  base_stability: number
  coords: Coords
  multi_ethnic: boolean
  ethnic_groups: string[]
  adjacent_zones: string[]
  strategic_value: string
}

/** Wrapper for zones.json. */
export interface ZonesContent {
  version: string
  schema_version: string
  updated_at: string
  zones: ZoneData[]
}

/** Optional authored runtime seed data for zone-scoped session fields. */
export interface ZoneRuntimeSeedEntry {
  zone_id: string
  displaced?: number
  threats?: string[]
  incidents?: string[]
  actors_present?: string[]
  source_refs?: string[]
}

/** Wrapper for zone runtime seed content. */
export interface ZoneRuntimeSeedContent {
  version: string
  schema_version: string
  updated_at: string
  zone_runtime_seed: ZoneRuntimeSeedEntry[]
}

/** Per-session zone state. RUNTIME_DATA_REQUIREMENTS zone_state. */
export interface ZoneState {
  zone_id: string
  territory_key: TerritoryKey
  stability: number
  insurgency: number
  civilian_support: number
  threat_level: number
  population: number
  displaced: number
  threats: string[]
  incidents: string[]
  actors_present: string[]
}

// ---------------------------------------------------------------------------
// Actors (content + runtime sentiment)
// ---------------------------------------------------------------------------

/** One actor from actors.json (content data). */
export interface ActorData {
  actor_key: string
  name_key: string
  title_key: string
  faction: string
  type: string
  profile: string
  default_sentiment: string
  default_relationship_score: number | null
  relationship_tracked: boolean
  portrait_url: string
  notes?: string
  activation_condition?: string
}

/** Wrapper for actors.json. */
export interface ActorsContent {
  version: string
  schema_version: string
  updated_at: string
  actors: ActorData[]
}

/** Relationship label derived from relationship_score (0–100). */
export type RelationshipLabel =
  | 'hostile'
  | 'adversarial'
  | 'neutral'
  | 'cooperative'
  | 'allied'

/** Per-session actor sentiment. RUNTIME_DATA_REQUIREMENTS actor_sentiments. */
export interface ActorSentiment {
  actor_key: string
  sentiment: string
  relationship_score: number
  relationship_label: RelationshipLabel
  stance: string
  dialogue_state: string
}

// ---------------------------------------------------------------------------
// Intel (content + runtime feed)
// ---------------------------------------------------------------------------

/** One intel report definition from intel_reports.json (content data). */
export interface IntelReportData {
  report_key: string
  headline_key: string
  body_key: string
  urgency: string
  confidence_level: string
  sources: string[]
  zone_scope: string | null
  generated_by: string
  expiry_turns: number
}

/** Wrapper for intel_reports.json. */
export interface IntelReportsContent {
  version: string
  schema_version: string
  updated_at: string
  intel_reports: IntelReportData[]
}

/** Wrapper for localization_en.json. */
export interface LocalizationContent {
  version: string
  schema_version: string
  updated_at: string
  language_code?: string
  strings: Record<string, string>
}

/** Resolved intel report for UI (headline/body resolved from localization). */
export interface IntelReportResolved {
  report_key: string
  headline_text: string
  body_text: string
  sources: string[]
  urgency: string
  confidence_level: string
  zone_scope: string | null
  generated_by: string
  expiry_turns: number
}

/** Per-session intel feed item. RUNTIME_DATA_REQUIREMENTS intel_feed_items. */
export interface IntelFeedItem {
  report_key: string
  is_urgent: boolean
  occurred_at: number
  is_read: boolean
}

// ---------------------------------------------------------------------------
// Actions (content definitions for actionResolver)
// ---------------------------------------------------------------------------

/** Cost range per resource. actions.json costs.*. */
export interface ActionCostRange {
  min: number
  max: number
  step: number
  default: number
}

/** Action costs keyed by resource name. */
export interface ActionCosts {
  budget: ActionCostRange
  personnel: ActionCostRange
  political_capital: ActionCostRange
  intel_points: ActionCostRange
  time_months: ActionCostRange
}

/** Target for an action. Exactly one of zone_id, territory_key, actor_key per target_scope. */
export interface ActionTarget {
  zone_id?: string
  territory_key?: TerritoryKey
  actor_key?: string
}

/** One action from actions.json (content data). */
export interface ActionDefinition {
  action_id: string
  name_key: string
  description_key: string
  category: string
  target_scope: 'zone' | 'territory' | 'actor'
  target_actors?: string[]
  tags?: string[]
  unlocks_dialogue?: string
  costs: ActionCosts
  cooldown_turns?: number
  intel_gate?: number
  effects: {
    metrics?: Partial<Metrics>
    resources?: Partial<Resources>
    ai_state?: Partial<AiState>
    zone_effects?: Record<string, number>
    actor_effects?: { relationship_score?: number }
    flags?: string[]
    sets_oversight_level?: OversightLevel
    sets_audit_status?: AuditStatus
    risks?: {
      civilian_harm_chance?: number
      civilian_harm_effects?: Partial<Metrics>
    }
  }
  requirements?: {
    min_personnel?: number
    min_intel_points?: number
    min_political_capital?: number
    min_budget?: number
    flags_required?: string[]
    condition?: string
  }
  delay_turns?: number
  delayed_effects?: {
    metrics?: Partial<Metrics>
    resources?: Partial<Resources>
    ai_state?: Partial<AiState>
  }
}

/** Wrapper for actions.json. */
export interface ActionsContent {
  version: string
  schema_version: string
  updated_at: string
  actions: ActionDefinition[]
}

/** Per-session action execution log entry for status reporting. */
export interface ActionLogEntry {
  turn: number
  action_id: string
  target: ActionTarget
  costs: Resources
  resource_deltas: Partial<Resources>
  metric_deltas: Partial<Metrics>
  flag_additions: string[]
}

// ---------------------------------------------------------------------------
// Dialogues, events, and cutscenes (content only for now)
// ---------------------------------------------------------------------------

export interface DialogueChoiceData {
  choice_id: string
  label_key: string
  description_key: string
  costs: Partial<Record<'political_capital' | 'budget', number>>
  effects: {
    actor_relationship?: number
    metrics?: Partial<Metrics>
    resources?: Partial<Resources>
    flags?: string[]
    modifiers?: Record<string, number>
    sets_audit_status?: AuditStatus
  }
  next: string
}

export interface DialogueNodeData {
  type?: string
  speaker_key?: string
  text_key?: string
  next?: string
  end?: boolean
  choices?: DialogueChoiceData[]
}

export interface DialogueData {
  dialogue_id: string
  actor_key: string
  trigger_condition: string
  unlock_action?: string
  available_turns: number[]
  node_graph: Record<string, DialogueNodeData | undefined>
}

export interface DialoguesContent {
  version: string
  schema_version: string
  updated_at: string
  dialogues: DialogueData[]
}

export interface EventEffectsData {
  metrics: Record<string, number>
  resources: Record<string, number>
}

export interface EventOutcomeData {
  effects: EventEffectsData
  followup_events: string[]
  flags: string[]
}

export interface PenaltyBundleData {
  effects: EventEffectsData
  flags: string[]
}

export interface EventData {
  event_id: string
  event_type: string
  category: string
  priority: number
  trigger_conditions: string
  trigger_turn: number
  deadline_turn: number | null
  deadline_offset: number | null
  failure_on_deadline: boolean
  narrative_text_key: string
  outcomes: EventOutcomeData
  penalty_bundle: PenaltyBundleData
}

export interface EventsContent {
  events: EventData[]
}

export type ActiveEventStatus = 'active' | 'resolved' | 'expired'

export interface ActiveEventState {
  event_id: string
  event_type: string
  category: string
  trigger_turn: number
  deadline_turn: number | null
  failure_on_deadline: boolean
  status: ActiveEventStatus
}

export interface EventLogEntry {
  turn: number
  event_id: string
  event_type: string
  category: string
  narrative_text_key: string
  source: 'trigger' | 'penalty'
  metric_deltas: Partial<Metrics>
  resource_deltas: Partial<Resources>
  flag_additions: string[]
}

export interface CutsceneData {
  cutscene_id: string
  act: number
  trigger_turn: number
  trigger_condition: string
  media_url: string
  fallback_image_url: string
  text_key: string
  speaker_key: string
  duration_seconds: number
  skippable: boolean
  auto_advance: boolean
}

export interface CutscenesContent {
  version: string
  schema_version: string
  updated_at: string
  cutscenes: CutsceneData[]
}

// ---------------------------------------------------------------------------
// Aggregated content (for loaders and engine)
// ---------------------------------------------------------------------------

/** All content packs loaded from src/data JSON at startup. */
export interface GameContent {
  territories: TerritoriesContent
  zones: ZonesContent
  zone_runtime_seed: ZoneRuntimeSeedContent
  actors: ActorsContent
  intel_reports: IntelReportsContent
  actions: ActionsContent
  dialogues: DialoguesContent
  events: EventsContent
  cutscenes: CutscenesContent
  localization: LocalizationContent
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class GameError extends Error {
  readonly code: string | undefined
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'GameError'
    this.code = code
  }
}
