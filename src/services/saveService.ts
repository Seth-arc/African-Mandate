import { z } from 'zod'
import { ensureCurrentProfileRecord } from './authService'
import { applyDifficultyToConfig, resolveDifficultyMode } from '../state/gameSetup'
import { resolveActionName } from '../state/selectors'
import type { GameState } from '../state/types'
import { GameError } from '../state/types'
import { validateGameState } from '../systems/validation'
import type { Database, JsonValue } from './supabaseClient'
import { requireSupabaseClient } from './supabaseClient'

const SNAPSHOT_VERSION = 1
const LOCAL_INDEX_KEY = 'african_mandate.sessions.index.v1'
const LOCAL_RECORD_KEY_PREFIX = 'african_mandate.sessions.record.v1.'
export const SESSION_NAME_MAX_LENGTH = 72

export type SaveReason = 'manual' | 'after_action' | 'end_turn' | 'dialogue' | 'intel'
export type SaveMode = 'auto' | 'manual'

type RuntimeSnapshot = Omit<GameState, 'config' | 'content'>

export interface PersistedSnapshot {
  snapshot_version: number
  runtime_state: RuntimeSnapshot
}

export interface SessionSummary {
  session_id: string
  session_name: string | null
  turn: number
  max_turns: number
  last_played_at: string
  schema_version: number
  is_guest: boolean
}

export interface SaveSessionInput {
  state: GameState
  session_id?: string | null
  session_name?: string | null
  user_id?: string | null
  reason: SaveReason
  mode: SaveMode
}

interface LocalSessionRecord extends SessionSummary {
  save_reason: SaveReason
  save_mode: SaveMode
  snapshot: PersistedSnapshot
}

type GameSessionInsert = Database['public']['Tables']['game_sessions']['Insert']
type GameSessionRow = Database['public']['Tables']['game_sessions']['Row']
type ActionLogInsert = Database['public']['Tables']['actions_log']['Insert']

const persistedSnapshotSchema: z.ZodType<PersistedSnapshot> = z.object({
  snapshot_version: z.number().int().positive(),
  runtime_state: z.custom<RuntimeSnapshot>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    'runtime_state must be an object'
  ),
})

const localSessionRecordSchema: z.ZodType<LocalSessionRecord> = z.object({
  session_id: z.string().min(1),
  session_name: z.string().nullable(),
  turn: z.number().int().min(1),
  max_turns: z.number().int().min(1),
  last_played_at: z.string().min(1),
  schema_version: z.number().int().min(1),
  is_guest: z.boolean(),
  save_reason: z.enum(['manual', 'after_action', 'end_turn', 'dialogue', 'intel']),
  save_mode: z.enum(['auto', 'manual']),
  snapshot: persistedSnapshotSchema,
})

const localSessionIndexSchema = z.array(z.string().min(1))

function defaultSessionName(turn: number): string {
  return `Mandate - Turn ${turn}`
}

export function normalizeSessionName(name: string | null | undefined): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, SESSION_NAME_MAX_LENGTH)
}

function getRecordKey(sessionId: string): string {
  return `${LOCAL_RECORD_KEY_PREFIX}${sessionId}`
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `session_${Date.now()}_${Math.floor(Math.random() * 10_000_000)}`
}

function toSummary(record: LocalSessionRecord): SessionSummary {
  return {
    session_id: record.session_id,
    session_name: record.session_name,
    turn: record.turn,
    max_turns: record.max_turns,
    last_played_at: record.last_played_at,
    schema_version: record.schema_version,
    is_guest: record.is_guest,
  }
}

function toJsonValue(value: unknown): JsonValue {
  return value as JsonValue
}

function extractRuntimeState(state: GameState): RuntimeSnapshot {
  const { config: _config, content: _content, ...runtimeState } = state
  return structuredClone(runtimeState)
}

function getStorage(): Storage {
  const candidate =
    typeof window !== 'undefined'
      ? window.localStorage
      : (globalThis as { localStorage?: Storage }).localStorage
  if (!candidate) {
    throw new GameError('Local storage is unavailable outside a browser runtime.', 'LOCAL_STORAGE_UNAVAILABLE')
  }
  try {
    return candidate
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown local storage error'
    throw new GameError(`Local storage access failed: ${message}`, 'LOCAL_STORAGE_UNAVAILABLE')
  }
}

function readLocalIndex(storage: Storage): string[] {
  const raw = storage.getItem(LOCAL_INDEX_KEY)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const result = localSessionIndexSchema.safeParse(parsed)
  return result.success ? result.data : []
}

function writeLocalIndex(storage: Storage, ids: string[]): void {
  storage.setItem(LOCAL_INDEX_KEY, JSON.stringify(ids))
}

function readLocalRecord(storage: Storage, sessionId: string): LocalSessionRecord | null {
  const raw = storage.getItem(getRecordKey(sessionId))
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const validated = localSessionRecordSchema.safeParse(parsed)
  if (!validated.success) {
    return null
  }
  return validated.data
}

function writeLocalRecord(storage: Storage, record: LocalSessionRecord): void {
  storage.setItem(getRecordKey(record.session_id), JSON.stringify(record))
}

export function requireAuthenticatedUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw new GameError('Authentication is required for cloud session access.', 'AUTH_REQUIRED')
  }
  return userId
}

export function serializeGameState(state: GameState): PersistedSnapshot {
  validateGameState(state)
  return {
    snapshot_version: SNAPSHOT_VERSION,
    runtime_state: extractRuntimeState(state),
  }
}

export function deserializeGameState(snapshotRaw: unknown, baseState: GameState): GameState {
  const parsed = persistedSnapshotSchema.safeParse(snapshotRaw)
  if (!parsed.success) {
    throw new GameError('Persisted snapshot is invalid or corrupted.', 'INVALID_SNAPSHOT')
  }
  const runtimeState = parsed.data.runtime_state
  if (!runtimeState.session) {
    throw new GameError('Persisted snapshot is missing required session state.', 'INVALID_SNAPSHOT')
  }
  const difficultyMode = resolveDifficultyMode(
    'difficulty_mode' in runtimeState ? runtimeState.difficulty_mode : undefined
  )

  const restored: GameState = {
    ...baseState,
    ...structuredClone(runtimeState),
    config: applyDifficultyToConfig(baseState.config, difficultyMode),
    content: baseState.content,
  }
  validateGameState(restored)
  return restored
}

export function listLocalSessions(): SessionSummary[] {
  const storage = getStorage()
  const ids = readLocalIndex(storage)
  const sessions: SessionSummary[] = []

  for (const id of ids) {
    const record = readLocalRecord(storage, id)
    if (!record) continue
    sessions.push(toSummary(record))
  }

  return sessions.sort((a, b) => b.last_played_at.localeCompare(a.last_played_at))
}

export function saveLocalSessionSnapshot(input: SaveSessionInput): SessionSummary {
  const storage = getStorage()
  const sessionId = input.session_id ?? generateSessionId()
  const lastPlayedAt = new Date().toISOString()
  const snapshot = serializeGameState(input.state)
  const record: LocalSessionRecord = {
    session_id: sessionId,
    session_name: normalizeSessionName(input.session_name) ?? defaultSessionName(input.state.session.turn),
    turn: input.state.session.turn,
    max_turns: input.state.session.max_turns,
    last_played_at: lastPlayedAt,
    schema_version: input.state.config.total_turns,
    is_guest: true,
    save_reason: input.reason,
    save_mode: input.mode,
    snapshot,
  }

  writeLocalRecord(storage, record)
  const index = readLocalIndex(storage)
  const deduped = [sessionId, ...index.filter((id) => id !== sessionId)]
  writeLocalIndex(storage, deduped)
  return toSummary(record)
}

export function loadLocalSessionSnapshot(sessionId: string, baseState: GameState): GameState {
  const storage = getStorage()
  const record = readLocalRecord(storage, sessionId)
  if (!record) {
    throw new GameError(`Local session not found: ${sessionId}`, 'SESSION_NOT_FOUND')
  }
  return deserializeGameState(record.snapshot, baseState)
}

export function renameLocalSessionSnapshot(sessionId: string, sessionName: string | null | undefined): SessionSummary {
  const storage = getStorage()
  const record = readLocalRecord(storage, sessionId)
  if (!record) {
    throw new GameError(`Local session not found: ${sessionId}`, 'SESSION_NOT_FOUND')
  }

  const nextRecord: LocalSessionRecord = {
    ...record,
    session_name: normalizeSessionName(sessionName),
  }
  writeLocalRecord(storage, nextRecord)
  return toSummary(nextRecord)
}

function deriveActionCategory(state: GameState, actionId: string): string {
  if (actionId.startsWith('dialogue:')) {
    return 'dialogue'
  }
  if (actionId.startsWith('event_penalty:') || actionId.startsWith('event:')) {
    return 'event'
  }
  const action = state.content?.actions.actions.find((candidate) => candidate.action_id === actionId)
  return action?.category ?? 'unknown'
}

function actionLogRows(state: GameState, sessionId: string): ActionLogInsert[] {
  const actionLog = state.action_log ?? []
  return actionLog.map((entry) => ({
    session_id: sessionId,
    turn: entry.turn,
    action_id: entry.action_id,
    action_name: resolveActionName(state.content, entry.action_id),
    action_category: deriveActionCategory(state, entry.action_id),
    targets: toJsonValue(structuredClone(entry.target)),
    costs: toJsonValue(structuredClone(entry.costs)),
    effects: toJsonValue({
      resolution_timing: entry.resolution_timing ?? 'immediate_action',
      metric_deltas: structuredClone(entry.metric_deltas),
      resource_deltas: structuredClone(entry.resource_deltas),
      flag_additions: structuredClone(entry.flag_additions),
    }),
  }))
}

function mapCloudRowToSummary(row: Pick<GameSessionRow, 'id' | 'session_name' | 'turn' | 'max_turns' | 'last_played_at'>): SessionSummary {
  return {
    session_id: row.id,
    session_name: row.session_name,
    turn: row.turn,
    max_turns: row.max_turns,
    last_played_at: row.last_played_at,
    schema_version: 20,
    is_guest: false,
  }
}

export async function listCloudSessions(userId: string): Promise<SessionSummary[]> {
  const authUserId = requireAuthenticatedUserId(userId)
  const client = requireSupabaseClient()

  const { data, error } = await client
    .from('game_sessions')
    .select('id,session_name,turn,max_turns,last_played_at')
    .eq('user_id', authUserId)
    .order('last_played_at', { ascending: false })

  if (error) {
    throw new GameError(`Cloud session listing failed: ${error.message}`, 'SESSION_LIST_FAILED')
  }

  return (data ?? []).map((row) => mapCloudRowToSummary(row))
}

export async function saveCloudSessionSnapshot(input: SaveSessionInput): Promise<SessionSummary> {
  const userId = requireAuthenticatedUserId(input.user_id)
  await ensureCurrentProfileRecord(userId)
  const client = requireSupabaseClient()
  const sessionId = input.session_id ?? generateSessionId()
  const lastPlayedAt = new Date().toISOString()
  const snapshot = serializeGameState(input.state)

  const row: GameSessionInsert = {
    id: sessionId,
    user_id: userId,
    session_name: normalizeSessionName(input.session_name) ?? defaultSessionName(input.state.session.turn),
    turn: input.state.session.turn,
    actions_remaining: input.state.session.actions_remaining,
    max_turns: input.state.session.max_turns,
    resources: toJsonValue(structuredClone(input.state.session.resources)),
    metrics: toJsonValue(structuredClone(input.state.session.metrics)),
    ai_state: toJsonValue(structuredClone(input.state.session.ai_state)),
    state_snapshot: toJsonValue(snapshot),
    schema_version: input.state.config.total_turns,
    last_played_at: lastPlayedAt,
  }

  const { error: upsertError } = await client
    .from('game_sessions')
    .upsert(row, { onConflict: 'id' })

  if (upsertError) {
    throw new GameError(`Cloud session save failed: ${upsertError.message}`, 'SESSION_SAVE_FAILED')
  }

  const { error: deleteError } = await client.from('actions_log').delete().eq('session_id', sessionId)
  if (deleteError) {
    throw new GameError(`Action log sync delete failed: ${deleteError.message}`, 'ACTION_LOG_SYNC_FAILED')
  }

  const rows = actionLogRows(input.state, sessionId)
  if (rows.length > 0) {
    const { error: insertError } = await client.from('actions_log').insert(rows)
    if (insertError) {
      throw new GameError(`Action log sync insert failed: ${insertError.message}`, 'ACTION_LOG_SYNC_FAILED')
    }
  }

  return {
    session_id: sessionId,
    session_name: row.session_name ?? null,
    turn: row.turn,
    max_turns: row.max_turns,
    last_played_at: lastPlayedAt,
    schema_version: row.schema_version ?? 20,
    is_guest: false,
  }
}

export async function renameCloudSessionSnapshot(
  sessionId: string,
  userId: string,
  sessionName: string | null | undefined
): Promise<SessionSummary> {
  const authUserId = requireAuthenticatedUserId(userId)
  await ensureCurrentProfileRecord(authUserId)
  const client = requireSupabaseClient()
  const normalizedSessionName = normalizeSessionName(sessionName)

  const { data, error } = await client
    .from('game_sessions')
    .update({
      session_name: normalizedSessionName,
    })
    .eq('id', sessionId)
    .eq('user_id', authUserId)
    .select('id,session_name,turn,max_turns,last_played_at')
    .maybeSingle()

  if (error) {
    throw new GameError(`Cloud session rename failed: ${error.message}`, 'SESSION_RENAME_FAILED')
  }
  if (!data) {
    throw new GameError(`Cloud session not found: ${sessionId}`, 'SESSION_NOT_FOUND')
  }

  return mapCloudRowToSummary(data)
}

export async function loadCloudSessionSnapshot(
  sessionId: string,
  userId: string,
  baseState: GameState
): Promise<GameState> {
  const authUserId = requireAuthenticatedUserId(userId)
  const client = requireSupabaseClient()

  const { data, error } = await client
    .from('game_sessions')
    .select('id,user_id,state_snapshot')
    .eq('id', sessionId)
    .eq('user_id', authUserId)
    .maybeSingle()

  if (error) {
    throw new GameError(`Cloud session load failed: ${error.message}`, 'SESSION_LOAD_FAILED')
  }
  if (!data) {
    throw new GameError(`Cloud session not found: ${sessionId}`, 'SESSION_NOT_FOUND')
  }
  if (data.user_id !== authUserId) {
    throw new GameError('Session ownership validation failed.', 'SESSION_OWNERSHIP_MISMATCH')
  }

  return deserializeGameState(data.state_snapshot, baseState)
}
