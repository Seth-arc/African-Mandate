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
  saveCloudSessionSnapshot,
  saveLocalSessionSnapshot,
  type SaveMode,
  type SaveReason,
  type SessionSummary,
} from '../services/saveService'
import type { GameState } from './types'

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
  auth_mode: AuthMode
  user_id: string | null
  user_email: string | null
  user_display_name: string | null
  active_session_id: string | null
  autosave_enabled: boolean
  sessions: SessionSummary[]
  initialize: () => Promise<void>
  dispose: () => void
  refreshSessions: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOutToGuest: () => Promise<void>
  saveState: (state: GameState, mode: SaveMode, reason: SaveReason) => Promise<void>
  autosaveState: (state: GameState, reason: SaveReason) => Promise<void>
  loadState: (sessionId: string, baseState: GameState) => Promise<GameState>
  startNewCampaign: () => void
  setAutosaveEnabled: (enabled: boolean) => void
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

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  initialized: false,
  loading: false,
  saving: false,
  error: null,
  auth_mode: 'guest',
  user_id: null,
  user_email: null,
  user_display_name: null,
  active_session_id: null,
  autosave_enabled: true,
  sessions: [],

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const identity = await getCurrentIdentity()
      applyIdentity(set, identity)

      if (!authSubscriptionDisposer) {
        authSubscriptionDisposer = subscribeAuthChanges((nextIdentity) => {
          applyIdentity(set, nextIdentity)
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

  refreshSessions: async () => {
    const state = get()
    try {
      const sessions =
        state.auth_mode === 'authenticated' && state.user_id
          ? await listCloudSessions(state.user_id)
          : listLocalSessions()

      const activeSessionStillExists =
        state.active_session_id !== null &&
        sessions.some((session) => session.session_id === state.active_session_id)
      const nextActive = activeSessionStillExists
        ? state.active_session_id
        : sessions[0]?.session_id ?? null

      set({
        sessions,
        active_session_id: nextActive,
        error: null,
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
      set({ active_session_id: null })
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
      const currentSummary = state.sessions.find((session) => session.session_id === state.active_session_id)
      const sessionName = currentSummary?.session_name ?? null

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

      set({ active_session_id: summary.session_id })
      await get().refreshSessions()
    } catch (error) {
      set({ error: messageFromError(error) })
      throw error
    } finally {
      set({ saving: false })
    }
  },

  autosaveState: async (runtimeState, reason) => {
    if (!get().autosave_enabled) return
    await get().saveState(runtimeState, 'auto', reason)
  },

  loadState: async (sessionId, baseState) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      const nextState =
        state.auth_mode === 'authenticated' && state.user_id
          ? await loadCloudSessionSnapshot(sessionId, state.user_id, baseState)
          : loadLocalSessionSnapshot(sessionId, baseState)

      set({ active_session_id: sessionId })
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
    set({ active_session_id: null, error: null })
  },

  setAutosaveEnabled: (enabled) => {
    set({ autosave_enabled: enabled })
  },

  clearError: () => {
    set({ error: null })
  },
}))

