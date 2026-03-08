import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { GameError } from '../state/types'

type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue | undefined }
type JsonArray = JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          email: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          id: string
          user_id: string | null
          session_name: string | null
          turn: number
          actions_remaining: number
          max_turns: number
          resources: JsonValue
          metrics: JsonValue
          ai_state: JsonValue
          intel_layer_state: JsonValue
          state_snapshot: JsonValue
          schema_version: number
          last_played_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_name?: string | null
          turn: number
          actions_remaining: number
          max_turns: number
          resources: JsonValue
          metrics: JsonValue
          ai_state: JsonValue
          intel_layer_state?: JsonValue
          state_snapshot: JsonValue
          schema_version?: number
          last_played_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_name?: string | null
          turn?: number
          actions_remaining?: number
          max_turns?: number
          resources?: JsonValue
          metrics?: JsonValue
          ai_state?: JsonValue
          intel_layer_state?: JsonValue
          state_snapshot?: JsonValue
          schema_version?: number
          last_played_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      actions_log: {
        Row: {
          id: string
          session_id: string
          turn: number
          action_id: string
          action_name: string | null
          action_category: string | null
          targets: JsonValue
          costs: JsonValue
          effects: JsonValue
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          turn: number
          action_id: string
          action_name?: string | null
          action_category?: string | null
          targets?: JsonValue
          costs?: JsonValue
          effects?: JsonValue
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          turn?: number
          action_id?: string
          action_name?: string | null
          action_category?: string | null
          targets?: JsonValue
          costs?: JsonValue
          effects?: JsonValue
          created_at?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          id: string
          user_id: string
          strategic_score: number
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          strategic_score: number
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          strategic_score?: number
          completed_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL ?? ''
}

export function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseUrl().length > 0 && getSupabaseAnonKey().length > 0
}

let cachedClient: SupabaseClient<Database> | null | undefined

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  if (cachedClient === undefined) {
    cachedClient = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return cachedClient
}

export function requireSupabaseClient(): SupabaseClient<Database> {
  const client = getSupabaseClient()
  if (!client) {
    throw new GameError(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      'SUPABASE_NOT_CONFIGURED'
    )
  }
  return client
}
