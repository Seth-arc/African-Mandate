import { useState, type ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { useUiStore } from '../../state/uiStore'

function formatSessionLabel(name: string | null, turn: number): string {
  if (name && name.trim().length > 0) {
    return name
  }
  return `Mandate - Turn ${turn}`
}

export function SessionManagerBody(): ReactNode {
  const sessionStore = useSessionStore()
  const resetGame = useGameStore((s) => s.reset)
  const closeModal = useUiStore((s) => s.closeModal)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleManualSave = async (): Promise<void> => {
    setStatusMessage(null)
    const state = useGameStore.getState().state
    try {
      await sessionStore.saveState(state, 'manual', 'manual')
      setStatusMessage('Session saved.')
    } catch {
      setStatusMessage('Manual save failed.')
    }
  }

  const handleLoad = async (sessionId: string): Promise<void> => {
    setStatusMessage(null)
    try {
      const baseState = useGameStore.getState().state
      const restored = await sessionStore.loadState(sessionId, baseState)
      useGameStore.setState({ state: restored })
      setStatusMessage('Session restored.')
      closeModal()
    } catch {
      setStatusMessage('Session load failed.')
    }
  }

  const handleNewCampaign = (): void => {
    resetGame()
    sessionStore.startNewCampaign()
    setStatusMessage('Started a new campaign.')
  }

  const handleSignOut = async (): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.signOutToGuest()
      setStatusMessage('Signed out. Guest saves now use local storage.')
    } catch {
      setStatusMessage('Sign-out failed.')
    }
  }

  const handleSignIn = async (): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.signInWithGoogle()
    } catch {
      setStatusMessage('Sign-in failed.')
    }
  }

  return (
    <div className="action-config-layout">
      <div className="actor-profile-section">
        <div className="actor-profile-row">
          <span>Access mode</span>
          <strong>{sessionStore.auth_mode === 'authenticated' ? 'Signed in' : 'Guest'}</strong>
        </div>
        {sessionStore.auth_mode === 'authenticated' ? (
          <>
            <div className="actor-profile-row">
              <span>User</span>
              <strong>{sessionStore.user_display_name ?? sessionStore.user_email ?? sessionStore.user_id}</strong>
            </div>
            <button type="button" className="action-config-secondary" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </>
        ) : (
          <button type="button" className="action-config-secondary" onClick={() => void handleSignIn()}>
            Sign in with Google
          </button>
        )}
      </div>

      <div className="actor-profile-section">
        <div className="actor-profile-row">
          <span>Autosave</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={sessionStore.autosave_enabled}
              onChange={(event) => sessionStore.setAutosaveEnabled(event.target.checked)}
            />
            <span>{sessionStore.autosave_enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>
        <div className="action-config-review-actions">
          <button type="button" className="action-config-confirm" onClick={() => void handleManualSave()} disabled={sessionStore.saving}>
            Save now
          </button>
          <button type="button" className="action-config-secondary" onClick={handleNewCampaign}>
            New campaign
          </button>
        </div>
      </div>

      <div className="actor-profile-section">
        <div className="actor-profile-row">
          <span>Saved sessions</span>
          <strong>{sessionStore.sessions.length}</strong>
        </div>
        {sessionStore.sessions.length === 0 ? (
          <p className="actor-profile-text">No saved sessions yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {sessionStore.sessions.map((session) => {
              const active = session.session_id === sessionStore.active_session_id
              return (
                <div key={session.session_id} className="action-config-review">
                  <div className="action-config-review-row">
                    <span>{formatSessionLabel(session.session_name, session.turn)}</span>
                    <strong>{active ? 'Active' : 'Saved'}</strong>
                  </div>
                  <div className="action-config-review-row">
                    <span>Progress</span>
                    <strong>Turn {session.turn} / {session.max_turns}</strong>
                  </div>
                  <div className="action-config-review-row">
                    <span>Last played</span>
                    <strong>{new Date(session.last_played_at).toLocaleString()}</strong>
                  </div>
                  <button
                    type="button"
                    className="action-config-secondary"
                    onClick={() => void handleLoad(session.session_id)}
                    disabled={sessionStore.loading}
                  >
                    Load session
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(statusMessage || sessionStore.error) && (
        <div className="action-config-validation">
          {statusMessage ?? sessionStore.error}
        </div>
      )}
    </div>
  )
}
