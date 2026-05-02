import { create } from 'zustand'
import {
  getCurrentIdentity,
  signInWithGoogle,
  signOut,
  subscribeAuthChanges,
  type AuthIdentity,
  type AuthMode,
} from '../services/authService'
import {
  listCloudSessions,
  listLocalSessions,
  loadCloudSessionSnapshot,
  loadLocalSessionSnapshot,
  renameCloudSessionSnapshot,
  renameLocalSessionSnapshot,
  saveCloudSessionSnapshot,
  saveLocalSessionSnapshot,
  type SaveMode,
  type SaveReason,
  type SessionSummary,
} from '../services/saveService'
import { setTelemetryEnabled } from '../utils/telemetry'
import { reconcileTerritoryStateFromZones } from './territoryStateRuntime'
import {
  applySessionPreferencesToDocument,
  defaultSessionPreferences,
  readStoredSessionPreferences,
  writeStoredSessionPreferences,
  type SessionPreferences,
} from './sessionPreferences'
import type { DifficultyMode, GameState } from './types'

export type EntryLaunchKind = 'new' | 'resume' | null

interface LandingSessionStatusDetail {
  auth_mode: AuthMode
  has_sessions: boolean
  session_count: number
  last_played_at: string | null
  turn: number | null
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unexpected persistence runtime error.'
}

function guestIdentity(): AuthIdentity {
  return {
    auth_mode: 'guest',
    user_id: null,
    email: null,
    display_name: null,
  }
}

interface SessionStoreState {
  initialized: boolean
  loading: boolean
  saving: boolean
  error: string | null
  entry_gate_active: boolean
  entry_gate_confirmed: boolean
  entry_launch_kind: EntryLaunchKind
  auth_mode: AuthMode
  user_id: string | null
  user_email: string | null
  user_display_name: string | null
  active_session_id: string | null
  active_session_name_draft: string
  launch_session_name_draft: string
  autosave_enabled: boolean
  sessions: SessionSummary[]
  preferences: SessionPreferences
  initialize: () => Promise<void>
  dispose: () => void
  beginEntryGate: () => void
  completeEntryGate: (launchKind: Exclude<EntryLaunchKind, null>) => void
  refreshSessions: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOutToGuest: () => Promise<void>
  saveState: (state: GameState, mode: SaveMode, reason: SaveReason) => Promise<void>
  autosaveState: (state: GameState, reason: SaveReason) => Promise<void>
  loadState: (sessionId: string, baseState: GameState) => Promise<GameState>
  startNewCampaign: () => void
  renameSession: (sessionId: string, sessionName: string) => Promise<void>
  setActiveSessionNameDraft: (name: string) => void
  setLaunchSessionNameDraft: (name: string) => void
  setAutosaveEnabled: (enabled: boolean) => void
  setAnalyticsOptIn: (enabled: boolean) => void
  setDifficultyMode: (mode: DifficultyMode) => void
  setHighContrastEnabled: (enabled: boolean) => void
  setReducedMotionEnabled: (enabled: boolean) => void
  setTooltipsEnabled: (enabled: boolean) => void
  clearError: () => void
}

let authSubscriptionDisposer: (() => void) | null = null

function applyIdentity(set: (partial: Partial<SessionStoreState>) => void, identity: AuthIdentity): void {
  set({
    auth_mode: identity.auth_mode,
    user_id: identity.user_id,
    user_email: identity.email,
    user_display_name: identity.display_name,
  })
}

function applyPreferences(preferences: SessionPreferences): void {
  writeStoredSessionPreferences(preferences)
  applySessionPreferencesToDocument(preferences)
  setTelemetryEnabled(preferences.analytics_opt_in)
}

function emitLandingSessionStatus(detail: LandingSessionStatusDetail): void {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(
    new CustomEvent('african-mandate:landing-session-status', {
      detail,
    })
  )
}

function syncLandingStatus(state: Pick<SessionStoreState, 'auth_mode' | 'sessions'>): void {
  const latestSession = state.sessions[0] ?? null
  emitLandingSessionStatus({
    auth_mode: state.auth_mode,
    has_sessions: latestSession !== null,
    session_count: state.sessions.length,
    last_played_at: latestSession?.last_played_at ?? null,
    turn: latestSession?.turn ?? null,
  })
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  initialized: false,
  loading: false,
  saving: false,
  error: null,
  entry_gate_active: false,
  entry_gate_confirmed: true,
  entry_launch_kind: null,
  auth_mode: 'guest',
  user_id: null,
  user_email: null,
  user_display_name: null,
  active_session_id: null,
  active_session_name_draft: '',
  launch_session_name_draft: '',
  autosave_enabled: true,
  sessions: [],
  preferences: defaultSessionPreferences(),

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const identity = await getCurrentIdentity()
      const preferences = readStoredSessionPreferences()
      applyIdentity(set, identity)
      applyPreferences(preferences)
      set({
        autosave_enabled: true,
        preferences,
      })

      if (!authSubscriptionDisposer) {
        authSubscriptionDisposer = subscribeAuthChanges((nextIdentity) => {
          set((state) => ({
            auth_mode: nextIdentity.auth_mode,
            user_id: nextIdentity.user_id,
            user_email: nextIdentity.email,
            user_display_name: nextIdentity.display_name,
            autosave_enabled: state.autosave_enabled,
          }))
          void get().refreshSessions()
        })
      }

      await get().refreshSessions()
      set({ initialized: true })
    } catch (error) {
      set({
        initialized: true,
        error: messageFromError(error),
      })
    } finally {
      set({ loading: false })
    }
  },

  dispose: () => {
    if (!authSubscriptionDisposer) return
    authSubscriptionDisposer()
    authSubscriptionDisposer = null
  },

  beginEntryGate: () => {
    set({
      entry_gate_active: true,
      entry_gate_confirmed: false,
      entry_launch_kind: null,
      error: null,
    })
  },

  completeEntryGate: (launchKind) => {
    set({
      entry_gate_confirmed: true,
      entry_launch_kind: launchKind,
      error: null,
    })
  },

  refreshSessions: async () => {
    const state = get()
    try {
      const sessions =
        state.auth_mode === 'authenticated' && state.user_id
          ? await listCloudSessions(state.user_id)
          : listLocalSessions()

      const preserveUnsavedNewCampaign =
        state.entry_gate_confirmed &&
        state.entry_launch_kind === 'new' &&
        state.active_session_id === null
      const activeSessionStillExists =
        state.active_session_id !== null &&
        sessions.some((session) => session.session_id === state.active_session_id)
      const nextActive = preserveUnsavedNewCampaign
        ? null
        : activeSessionStillExists
          ? state.active_session_id
          : sessions[0]?.session_id ?? null
      const activeSummary = nextActive
        ? sessions.find((session) => session.session_id === nextActive) ?? null
        : null
      const nextActiveSessionNameDraft =
        nextActive !== null &&
        (nextActive !== state.active_session_id || state.active_session_name_draft.trim().length === 0)
          ? activeSummary?.session_name ?? ''
          : state.active_session_name_draft

      set({
        sessions,
        active_session_id: nextActive,
        active_session_name_draft: nextActiveSessionNameDraft,
        error: null,
      })
      syncLandingStatus({
        auth_mode: state.auth_mode,
        sessions,
      })
    } catch (error) {
      set({ error: messageFromError(error) })
    }
  },

  signInWithGoogle: async () => {
    set({ error: null })
    try {
      await signInWithGoogle()
    } catch (error) {
      set({ error: messageFromError(error) })
      throw error
    }
  },

  signOutToGuest: async () => {
    set({ loading: true, error: null })
    try {
      await signOut()
      applyIdentity(set, guestIdentity())
      set((state) => ({
        active_session_id: null,
        active_session_name_draft: '',
        launch_session_name_draft: '',
        autosave_enabled: state.autosave_enabled,
        sessions: [],
        entry_gate_confirmed: state.entry_gate_confirmed,
      }))
      await get().refreshSessions()
    } catch (error) {
      set({ error: messageFromError(error) })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  saveState: async (runtimeState, mode, reason) => {
    set({ saving: true, error: null })
    try {
      const state = get()
      if (state.entry_gate_active && !state.entry_gate_confirmed) {
        throw new Error('Choose a campaign start mode before saving sessions.')
      }
      const sessionName = state.active_session_name_draft

      const summary =
        state.auth_mode === 'authenticated' && state.user_id
          ? await saveCloudSessionSnapshot({
              state: runtimeState,
              session_id: state.active_session_id,
              session_name: sessionName,
              user_id: state.user_id,
              reason,
              mode,
            })
          : saveLocalSessionSnapshot({
              state: runtimeState,
              session_id: state.active_session_id,
              session_name: sessionName,
              reason,
              mode,
            })

      set({
        active_session_id: summary.session_id,
        active_session_name_draft: summary.session_name ?? '',
      })
      await get().refreshSessions()
    } catch (error) {
      set({ error: messageFromError(error) })
      throw error
    } finally {
      set({ saving: false })
    }
  },

  autosaveState: async (runtimeState, reason) => {
    const state = get()
    if (!state.autosave_enabled) return
    await get().saveState(runtimeState, 'auto', reason)
  },

  loadState: async (sessionId, baseState) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      const loadedState =
        state.auth_mode === 'authenticated' && state.user_id
          ? await loadCloudSessionSnapshot(sessionId, state.user_id, baseState)
          : loadLocalSessionSnapshot(sessionId, baseState)
      const nextState = reconcileTerritoryStateFromZones(loadedState)

      const activeSummary = state.sessions.find((session) => session.session_id === sessionId) ?? null
      set({
        active_session_id: sessionId,
        active_session_name_draft: activeSummary?.session_name ?? '',
      })
      await get().refreshSessions()
      return nextState
    } catch (error) {
      set({ error: messageFromError(error) })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  startNewCampaign: () => {
    set((state) => ({
      active_session_id: null,
      active_session_name_draft: state.launch_session_name_draft,
      launch_session_name_draft: '',
      error: null,
    }))
  },

  renameSession: async (sessionId, sessionName) => {
    set({ saving: true, error: null })
    try {
      const state = get()
      const summary =
        state.auth_mode === 'authenticated' && state.user_id
          ? await renameCloudSessionSnapshot(sessionId, state.user_id, sessionName)
          : renameLocalSessionSnapshot(sessionId, sessionName)

      set((currentState) => ({
        active_session_name_draft:
          currentState.active_session_id === sessionId ? summary.session_name ?? '' : currentState.active_session_name_draft,
      }))
      await get().refreshSessions()
    } catch (error) {
      set({ error: messageFromError(error) })
      throw error
    } finally {
      set({ saving: false })
    }
  },

  setActiveSessionNameDraft: (name) => {
    set({ active_session_name_draft: name })
  },

  setLaunchSessionNameDraft: (name) => {
    set({ launch_session_name_draft: name })
  },

  setAutosaveEnabled: (enabled) => {
    set({ autosave_enabled: enabled })
  },

  setAnalyticsOptIn: (enabled) => {
    set((state) => {
      const preferences = {
        ...state.preferences,
        analytics_opt_in: enabled,
      }
      applyPreferences(preferences)
      return { preferences }
    })
  },

  setDifficultyMode: (mode) => {
    set((state) => {
      const preferences = {
        ...state.preferences,
        difficulty_mode: mode,
      }
      applyPreferences(preferences)
      return { preferences }
    })
  },

  setHighContrastEnabled: (enabled) => {
    set((state) => {
      const preferences = {
        ...state.preferences,
        high_contrast_enabled: enabled,
      }
      applyPreferences(preferences)
      return { preferences }
    })
  },

  setReducedMotionEnabled: (enabled) => {
    set((state) => {
      const preferences = {
        ...state.preferences,
        reduced_motion_enabled: enabled,
      }
      applyPreferences(preferences)
      return { preferences }
    })
  },

  setTooltipsEnabled: (enabled) => {
    set((state) => {
      const preferences = {
        ...state.preferences,
        tooltips_enabled: enabled,
      }
      applyPreferences(preferences)
      return { preferences }
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))
