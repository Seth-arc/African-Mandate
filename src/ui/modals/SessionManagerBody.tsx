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
  const [profileName, setProfileName] = useState('')
  const [email, setEmail] = useState('')
  const requiresAccessChoice = sessionStore.entry_gate_active && !sessionStore.entry_gate_confirmed
  const isAuthenticated = sessionStore.auth_mode === 'authenticated'

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
      setStatusMessage('Signed out. Guest mode keeps progress for this run only.')
    } catch {
      setStatusMessage('Sign-out failed.')
    }
  }

  const handleSignIn = async (flow: 'signup' | 'login' = 'login'): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.signInWithGoogle()
    } catch {
      setStatusMessage(flow === 'signup' ? 'Sign-up failed.' : 'Sign-in failed.')
    }
  }

  const handleContinueAsGuest = async (): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.confirmGuestEntry()
      setStatusMessage('Guest mode confirmed. Save/load is disabled until you sign in.')
    } catch {
      setStatusMessage('Guest mode activation failed.')
    }
  }

  return (
    <div className="action-config-layout">
      {requiresAccessChoice && (
        <div className="session-auth-shell">
          <div className="session-auth-card">
            <div className="session-auth-header">
              <span className="session-auth-kicker">Secure Access</span>
              <h3 className="session-auth-title">Login / Sign Up</h3>
              <p className="session-auth-text">
                Signing in enables cloud save, restore, and leaderboard participation.
              </p>
            </div>

            <label className="session-auth-field">
              <span>Profile Name</span>
              <input
                className="session-auth-input"
                type="text"
                placeholder="Special Envoy"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </label>

            <label className="session-auth-field">
              <span>Email</span>
              <input
                className="session-auth-input"
                type="email"
                placeholder="envoy@au.int"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <div className="session-auth-actions">
              <button
                type="button"
                className="action-config-confirm"
                onClick={() => void handleSignIn('signup')}
                disabled={sessionStore.loading}
              >
                Sign Up
              </button>
              <button
                type="button"
                className="action-config-secondary"
                onClick={() => void handleSignIn('login')}
                disabled={sessionStore.loading}
              >
                Login
              </button>
            </div>

            <button
              type="button"
              className="session-auth-guest"
              onClick={() => void handleContinueAsGuest()}
              disabled={sessionStore.loading}
            >
              Continue as Guest
            </button>
          </div>
        </div>
      )}

      {!requiresAccessChoice && (
        <div className="actor-profile-section">
          <div className="actor-profile-row">
            <span>Access mode</span>
            <strong>{isAuthenticated ? 'Signed in' : 'Guest'}</strong>
          </div>
          {isAuthenticated ? (
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
            <>
              <p className="actor-profile-text">
                Guest mode is playable, but session save/load is disabled. Sign in to enable persistence.
              </p>
              <button type="button" className="action-config-secondary" onClick={() => void handleSignIn('login')}>
                Sign in
              </button>
            </>
          )}
        </div>
      )}

      {!requiresAccessChoice && isAuthenticated && (
        <div className="actor-profile-section">
          <div className="actor-profile-row">
            <span>Autosave (cloud)</span>
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
      )}

      {!requiresAccessChoice && isAuthenticated && (
        <div className="actor-profile-section">
          <div className="actor-profile-row">
            <span>Cloud sessions</span>
            <strong>{sessionStore.sessions.length}</strong>
          </div>
          {sessionStore.sessions.length === 0 ? (
            <p className="actor-profile-text">No cloud sessions yet.</p>
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
                      Load cloud session
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!requiresAccessChoice && !isAuthenticated && (
        <div className="actor-profile-section">
          <div className="actor-profile-row">
            <span>Persistence</span>
            <strong>Disabled in guest mode</strong>
          </div>
          <p className="actor-profile-text">
            Guest sessions cannot be saved or loaded. Sign in when you want persistent campaign progress.
          </p>
          <div className="action-config-review-actions">
            <button type="button" className="action-config-secondary" onClick={handleNewCampaign}>
              New campaign
            </button>
            <button type="button" className="action-config-confirm" onClick={() => void handleSignIn('login')}>
              Enable cloud save
            </button>
          </div>
        </div>
      )}

      {(statusMessage || sessionStore.error) && (
        <div className="action-config-validation">
          {statusMessage ?? sessionStore.error}
        </div>
      )}
      {!requiresAccessChoice && (
        <div className="action-config-review-actions">
          <button type="button" className="action-config-secondary" onClick={closeModal}>
            Close
          </button>
        </div>
      )}
    </div>
  )
}
