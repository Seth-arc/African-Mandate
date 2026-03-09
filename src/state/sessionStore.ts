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
  loadCloudSessionSnapshot,
  saveCloudSessionSnapshot,
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
  entry_gate_active: boolean
  entry_gate_confirmed: boolean
  auth_mode: AuthMode
  user_id: string | null
  user_email: string | null
  user_display_name: string | null
  active_session_id: string | null
  autosave_enabled: boolean
  sessions: SessionSummary[]
  initialize: () => Promise<void>
  dispose: () => void
  beginEntryGate: () => void
  confirmGuestEntry: () => Promise<void>
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
  entry_gate_active: false,
  entry_gate_confirmed: true,
  auth_mode: 'guest',
  user_id: null,
  user_email: null,
  user_display_name: null,
  active_session_id: null,
  autosave_enabled: false,
  sessions: [],

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const identity = await getCurrentIdentity()
      applyIdentity(set, identity)
      set({ autosave_enabled: identity.auth_mode === 'authenticated' })

      if (!authSubscriptionDisposer) {
        authSubscriptionDisposer = subscribeAuthChanges((nextIdentity) => {
          set((state) => ({
            auth_mode: nextIdentity.auth_mode,
            user_id: nextIdentity.user_id,
            user_email: nextIdentity.email,
            user_display_name: nextIdentity.display_name,
            autosave_enabled: nextIdentity.auth_mode === 'authenticated',
            entry_gate_confirmed:
              nextIdentity.auth_mode === 'authenticated' ? true : state.entry_gate_confirmed,
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
    set((state) => ({
      entry_gate_active: true,
      entry_gate_confirmed: state.auth_mode === 'authenticated',
      error: null,
    }))
  },

  confirmGuestEntry: async () => {
    set({
      entry_gate_confirmed: true,
      autosave_enabled: false,
      sessions: [],
      active_session_id: null,
      error: null,
    })
    await get().refreshSessions()
  },

  refreshSessions: async () => {
    const state = get()
    try {
      if (state.auth_mode !== 'authenticated' || !state.user_id) {
        set({
          sessions: [],
          active_session_id: null,
          error: null,
        })
        return
      }

      const sessions = await listCloudSessions(state.user_id)

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
      set((state) => ({
        active_session_id: null,
        autosave_enabled: false,
        sessions: [],
        entry_gate_confirmed: state.entry_gate_active ? false : state.entry_gate_confirmed,
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
        throw new Error('Choose sign-in or continue as guest before saving sessions.')
      }
      if (state.auth_mode !== 'authenticated' || !state.user_id) {
        throw new Error('Sign in with Google to save sessions.')
      }
      const currentSummary = state.sessions.find((session) => session.session_id === state.active_session_id)
      const sessionName = currentSummary?.session_name ?? null

      const summary = await saveCloudSessionSnapshot({
        state: runtimeState,
        session_id: state.active_session_id,
        session_name: sessionName,
        user_id: state.user_id,
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
    const state = get()
    if (state.auth_mode !== 'authenticated' || !state.user_id) return
    if (!state.autosave_enabled) return
    await get().saveState(runtimeState, 'auto', reason)
  },

  loadState: async (sessionId, baseState) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      if (state.entry_gate_active && !state.entry_gate_confirmed) {
        throw new Error('Choose sign-in or continue as guest before loading sessions.')
      }
      if (state.auth_mode !== 'authenticated' || !state.user_id) {
        throw new Error('Sign in with Google to load sessions.')
      }
      const nextState = await loadCloudSessionSnapshot(sessionId, state.user_id, baseState)

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
    set((state) => ({
      autosave_enabled: state.auth_mode === 'authenticated' ? enabled : false,
    }))
  },

  clearError: () => {
    set({ error: null })
  },
}))
