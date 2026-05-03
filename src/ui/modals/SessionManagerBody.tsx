import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { SESSION_NAME_MAX_LENGTH } from '../../services/saveService'
import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { useUiStore } from '../../state/uiStore'
import { recordTelemetryEvent } from '../../utils/telemetry'

function formatSessionLabel(name: string | null, turn: number): string {
  if (name && name.trim().length > 0) {
    return name
  }
  return `Mandate - Turn ${turn}`
}

function formatLastPlayed(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function SessionManagerBody(): ReactNode {
  const sessionStore = useSessionStore()
  const resetGame = useGameStore((s) => s.reset)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({})

  const requiresEntryChoice = sessionStore.entry_gate_active && !sessionStore.entry_gate_confirmed
  const isAuthenticated = sessionStore.auth_mode === 'authenticated'
  const latestSession = sessionStore.sessions[0] ?? null
  const activeSession = useMemo(
    () =>
      sessionStore.active_session_id
        ? sessionStore.sessions.find((session) => session.session_id === sessionStore.active_session_id) ?? null
        : null,
    [sessionStore.active_session_id, sessionStore.sessions]
  )

  useEffect(() => {
    setRenameDrafts((current) => {
      const next = { ...current }
      let changed = false

      for (const session of sessionStore.sessions) {
        if (!(session.session_id in next)) {
          next[session.session_id] = session.session_name ?? ''
          changed = true
        }
      }

      for (const sessionId of Object.keys(next)) {
        if (!sessionStore.sessions.some((session) => session.session_id === sessionId)) {
          delete next[sessionId]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [sessionStore.sessions])

  const handleContinueWithGoogle = async (): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.signInWithGoogle()
    } catch {
      setStatusMessage('Google sign-in failed.')
    }
  }

  const handleSignOut = async (): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.signOutToGuest()
      setStatusMessage('Signed out. This browser remains available for guest saves.')
    } catch {
      setStatusMessage('Sign-out failed.')
    }
  }

  const handleStartCampaign = (): void => {
    recordTelemetryEvent('funnel_campaign_started', {
      auth_mode: sessionStore.auth_mode,
      difficulty_mode: sessionStore.preferences.difficulty_mode,
      analytics_opt_in: sessionStore.preferences.analytics_opt_in,
      high_contrast_enabled: sessionStore.preferences.high_contrast_enabled,
      reduced_motion_enabled: sessionStore.preferences.reduced_motion_enabled,
      tooltips_enabled: sessionStore.preferences.tooltips_enabled,
      source: requiresEntryChoice ? 'entry_gate' : 'session_manager',
    })
    sessionStore.startNewCampaign()
    resetGame(sessionStore.preferences.difficulty_mode)
    setStatusMessage(null)

    if (requiresEntryChoice) {
      sessionStore.completeEntryGate('new')
      openModal('onboarding_loading')
      return
    }

    closeModal()
  }

  const handleLoad = async (sessionId: string): Promise<void> => {
    setStatusMessage(null)
    try {
      const baseState = useGameStore.getState().state
      const restored = await sessionStore.loadState(sessionId, baseState)
      useGameStore.setState({ state: restored })
      recordTelemetryEvent('funnel_campaign_resumed', {
        auth_mode: sessionStore.auth_mode,
        session_id: sessionId,
        turn: restored.session.turn,
        source: requiresEntryChoice ? 'entry_gate' : 'session_manager',
      })

      if (requiresEntryChoice) {
        sessionStore.completeEntryGate('resume')
        openModal('onboarding_loading')
        return
      }

      closeModal()
    } catch {
      setStatusMessage('Session load failed.')
    }
  }

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

  const handleRenameSession = async (sessionId: string): Promise<void> => {
    setStatusMessage(null)
    try {
      await sessionStore.renameSession(sessionId, renameDrafts[sessionId] ?? '')
      setStatusMessage('Session name updated.')
    } catch {
      setStatusMessage('Rename failed.')
    }
  }

  const handleRenameActiveSession = async (): Promise<void> => {
    if (!sessionStore.active_session_id) return
    setStatusMessage(null)
    try {
      await sessionStore.renameSession(sessionStore.active_session_id, sessionStore.active_session_name_draft)
      setStatusMessage('Active session name updated.')
    } catch {
      setStatusMessage('Active session rename failed.')
    }
  }

  return (
    <div className="action-config-layout session-manager-layout">
      <section className="session-manager-banner" aria-labelledby="session-manager-title">
        <div className="session-manager-banner-top">
          <div className="session-manager-banner-copy">
            <span className="session-manager-banner-kicker">Mission access</span>
            <h3 className="session-manager-banner-title" id="session-manager-title">
              Continue a mandate or launch a new campaign
            </h3>
            <p className="session-manager-banner-text">
              Select a card to resume a saved mandate or start a fresh campaign. Guest mode keeps saves in this browser.
              Google sign-in enables cloud save and restore.
            </p>
          </div>
          <div className="session-manager-meta" aria-label="Session overview">
            <span className="session-manager-meta-pill">{isAuthenticated ? 'Signed in' : 'Guest mode'}</span>
            <span className="session-manager-meta-pill">
              {isAuthenticated ? 'Cloud saves' : 'Browser saves'}: {sessionStore.sessions.length}
            </span>
            <span className="session-manager-meta-pill">
              Difficulty: {sessionStore.preferences.difficulty_mode}
            </span>
          </div>
        </div>

        <div className="session-manager-account-strip">
          <div className="session-manager-account-copy">
            <span className="session-manager-account-label">
              {isAuthenticated ? 'Cloud save is available' : 'Guest mode is active'}
            </span>
            <p className="session-manager-account-text">
              {isAuthenticated
                ? `Signed in as ${sessionStore.user_display_name ?? sessionStore.user_email ?? sessionStore.user_id}.`
                : 'Continue in this browser, or sign in with Google when you want cloud persistence.'}
            </p>
          </div>
          {isAuthenticated ? (
            <button
              type="button"
              className="action-config-secondary"
              onClick={() => void handleSignOut()}
              disabled={sessionStore.loading}
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className="action-config-secondary session-auth-google"
              onClick={() => void handleContinueWithGoogle()}
              disabled={sessionStore.loading}
            >
              <span className="session-auth-google-icon" aria-hidden="true">G</span>
              Continue with Google
            </button>
          )}
        </div>
      </section>

      <section className="session-manager-primary" aria-labelledby="session-manager-launch-title">
        <div className="session-manager-section-heading">
          <h4 className="session-manager-section-title" id="session-manager-launch-title">Campaign launch</h4>
          <p className="session-manager-section-copy">
            Select a card to resume a saved mandate, or use Start new campaign to begin a fresh run.
          </p>
        </div>

        <div className="session-launch-grid">
          <article className="session-launch-card">
            <span className="session-launch-kicker">Resume</span>
            <h5 className="session-launch-title">Continue mandate</h5>
            <div className="session-launch-meta">
              {latestSession ? (
                <>
                  <span>{formatSessionLabel(latestSession.session_name, latestSession.turn)}</span>
                  <span>Turn {latestSession.turn} / {latestSession.max_turns}</span>
                  <span>Last played {formatLastPlayed(latestSession.last_played_at)}</span>
                </>
              ) : (
                <span>No saved mandates are available yet.</span>
              )}
            </div>
            <p className="session-launch-copy">
              {latestSession
                ? `Resume the most recent ${isAuthenticated ? 'cloud' : 'browser'} save immediately.`
                : `A ${isAuthenticated ? 'cloud' : 'browser'} save will appear here after your first manual or autosave.`}
            </p>
            <div className="session-entry-actions">
              <button
                type="button"
                className="action-config-secondary"
                onClick={() => latestSession && void handleLoad(latestSession.session_id)}
                disabled={sessionStore.loading || !latestSession}
              >
                Continue mandate
              </button>
            </div>
          </article>

          <article className="session-launch-card">
            <span className="session-launch-kicker">New</span>
            <h5 className="session-launch-title">Start new campaign</h5>
            <div className="session-manager-name-field">
              <label className="session-manager-name-label" htmlFor="session-launch-name">
                Session name
              </label>
              <input
                id="session-launch-name"
                className="session-manager-name-input"
                type="text"
                maxLength={SESSION_NAME_MAX_LENGTH}
                placeholder="Mandate name"
                value={sessionStore.launch_session_name_draft}
                onChange={(event) => sessionStore.setLaunchSessionNameDraft(event.target.value)}
              />
            </div>
            <p className="session-launch-copy">
              Start from Turn 1 using the selected difficulty and interface preferences below.
            </p>
            <div className="session-entry-actions">
              <button
                type="button"
                className="action-config-confirm"
                onClick={handleStartCampaign}
                disabled={sessionStore.loading}
              >
                Start new campaign
              </button>
            </div>
          </article>
        </div>
      </section>

      <div className="session-manager-disclosures">
        <details className="session-manager-disclosure" open>
          <summary className="session-manager-disclosure-summary">
            <span className="session-manager-disclosure-copy">
              <span className="session-manager-disclosure-title">Campaign settings</span>
              <span className="session-manager-disclosure-text">
                Difficulty, analytics, accessibility, and interface help preferences.
              </span>
            </span>
            <span className="session-manager-disclosure-indicator" aria-hidden="true">Expand</span>
          </summary>
          <div className="session-manager-disclosure-panel">
            <fieldset className="session-preferences-fieldset">
              <legend className="session-preferences-legend">Difficulty</legend>
              <div className="session-difficulty-grid">
                <label className="session-difficulty-option">
                  <input
                    type="radio"
                    name="session-difficulty"
                    value="narrative"
                    checked={sessionStore.preferences.difficulty_mode === 'narrative'}
                    onChange={() => sessionStore.setDifficultyMode('narrative')}
                  />
                  <span className="session-difficulty-card">
                    <span className="session-difficulty-title">Narrative</span>
                    <span className="session-difficulty-copy">More onboarding guidance, more starting capacity, lighter event pressure.</span>
                  </span>
                </label>
                <label className="session-difficulty-option">
                  <input
                    type="radio"
                    name="session-difficulty"
                    value="standard"
                    checked={sessionStore.preferences.difficulty_mode === 'standard'}
                    onChange={() => sessionStore.setDifficultyMode('standard')}
                  />
                  <span className="session-difficulty-card">
                    <span className="session-difficulty-title">Standard</span>
                    <span className="session-difficulty-copy">Default pacing and resource profile for the full demo experience.</span>
                  </span>
                </label>
                <label className="session-difficulty-option">
                  <input
                    type="radio"
                    name="session-difficulty"
                    value="expert"
                    checked={sessionStore.preferences.difficulty_mode === 'expert'}
                    onChange={() => sessionStore.setDifficultyMode('expert')}
                  />
                  <span className="session-difficulty-card">
                    <span className="session-difficulty-title">Expert</span>
                    <span className="session-difficulty-copy">Lower starting resources and heavier event pressure from the outset.</span>
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset className="session-preferences-fieldset">
              <legend className="session-preferences-legend">Interface preferences</legend>
              <div className="session-preferences-group session-preferences-group--split">
                <label className="session-preference-toggle">
                  <input
                    type="checkbox"
                    checked={sessionStore.preferences.analytics_opt_in}
                    onChange={(event) => sessionStore.setAnalyticsOptIn(event.target.checked)}
                  />
                  <span>Local QA telemetry opt-in</span>
                </label>
                <label className="session-preference-toggle">
                  <input
                    type="checkbox"
                    checked={sessionStore.preferences.high_contrast_enabled}
                    onChange={(event) => sessionStore.setHighContrastEnabled(event.target.checked)}
                  />
                  <span>High contrast</span>
                </label>
                <label className="session-preference-toggle">
                  <input
                    type="checkbox"
                    checked={sessionStore.preferences.reduced_motion_enabled}
                    onChange={(event) => sessionStore.setReducedMotionEnabled(event.target.checked)}
                  />
                  <span>Reduced motion</span>
                </label>
                <label className="session-preference-toggle">
                  <input
                    type="checkbox"
                    checked={sessionStore.preferences.tooltips_enabled}
                    onChange={(event) => sessionStore.setTooltipsEnabled(event.target.checked)}
                  />
                  <span>Context tooltips on hover</span>
                </label>
              </div>
            </fieldset>
          </div>
        </details>

        <details className="session-manager-disclosure">
          <summary className="session-manager-disclosure-summary">
            <span className="session-manager-disclosure-copy">
              <span className="session-manager-disclosure-title">Saved mandates</span>
              <span className="session-manager-disclosure-text">
                Review, rename, and restore {isAuthenticated ? 'cloud' : 'browser'} sessions.
              </span>
            </span>
            <span className="session-manager-disclosure-indicator" aria-hidden="true">Expand</span>
          </summary>
          <div className="session-manager-disclosure-panel">
            {sessionStore.sessions.length === 0 ? (
              <p className="session-launch-copy">No saved mandates yet.</p>
            ) : (
              <div className="session-list">
                {sessionStore.sessions.map((session) => {
                  const isActive = session.session_id === sessionStore.active_session_id
                  const inputId = `saved-session-name-${session.session_id}`

                  return (
                    <article key={session.session_id} className="action-config-review">
                      <div className="action-config-review-row">
                        <span>{formatSessionLabel(session.session_name, session.turn)}</span>
                        <strong>{isActive ? 'Active' : isAuthenticated ? 'Cloud' : 'Browser'}</strong>
                      </div>
                      <div className="action-config-review-row">
                        <span>Progress</span>
                        <strong>Turn {session.turn} / {session.max_turns}</strong>
                      </div>
                      <div className="action-config-review-row">
                        <span>Last played</span>
                        <strong>{formatLastPlayed(session.last_played_at)}</strong>
                      </div>
                      <div className="session-manager-name-row">
                        <div className="session-manager-name-field">
                          <label className="session-manager-name-label" htmlFor={inputId}>Session name</label>
                          <input
                            id={inputId}
                            className="session-manager-name-input"
                            type="text"
                            maxLength={SESSION_NAME_MAX_LENGTH}
                            value={renameDrafts[session.session_id] ?? ''}
                            onChange={(event) =>
                              setRenameDrafts((current) => ({
                                ...current,
                                [session.session_id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="action-config-secondary"
                          onClick={() => void handleRenameSession(session.session_id)}
                          disabled={sessionStore.saving}
                        >
                          Rename
                        </button>
                      </div>
                      <div className="action-config-review-actions">
                        <button
                          type="button"
                          className="action-config-secondary"
                          onClick={() => void handleLoad(session.session_id)}
                          disabled={sessionStore.loading}
                        >
                          {requiresEntryChoice ? 'Resume mandate' : 'Load session'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </details>

        <details className="session-manager-disclosure">
          <summary className="session-manager-disclosure-summary">
            <span className="session-manager-disclosure-copy">
              <span className="session-manager-disclosure-title">Save controls</span>
              <span className="session-manager-disclosure-text">
                Manual save, autosave, and active session naming controls.
              </span>
            </span>
            <span className="session-manager-disclosure-indicator" aria-hidden="true">Expand</span>
          </summary>
          <div className="session-manager-disclosure-panel">
            <div className="session-manager-tools">
              <div className="session-manager-tools-row">
                <span className="session-manager-tools-label">Autosave</span>
                <label className="session-preference-toggle">
                  <input
                    type="checkbox"
                    checked={sessionStore.autosave_enabled}
                    onChange={(event) => sessionStore.setAutosaveEnabled(event.target.checked)}
                  />
                  <span>{sessionStore.autosave_enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>

              <div className="session-manager-name-row">
                <div className="session-manager-name-field">
                  <label className="session-manager-name-label" htmlFor="active-session-name">Active session name</label>
                  <input
                    id="active-session-name"
                    className="session-manager-name-input"
                    type="text"
                    maxLength={SESSION_NAME_MAX_LENGTH}
                    placeholder="Mandate name"
                    value={sessionStore.active_session_name_draft}
                    onChange={(event) => sessionStore.setActiveSessionNameDraft(event.target.value)}
                    disabled={!sessionStore.active_session_id}
                  />
                </div>
                <button
                  type="button"
                  className="action-config-secondary"
                  onClick={() => void handleRenameActiveSession()}
                  disabled={sessionStore.saving || !sessionStore.active_session_id}
                >
                  Rename
                </button>
              </div>

              <div className="action-config-review-actions">
                <button
                  type="button"
                  className="action-config-confirm"
                  onClick={() => void handleManualSave()}
                  disabled={sessionStore.saving}
                >
                  Save now
                </button>
                <button
                  type="button"
                  className="action-config-secondary"
                  onClick={handleStartCampaign}
                  disabled={sessionStore.loading}
                >
                  New campaign
                </button>
              </div>
            </div>

            {activeSession && (
              <p className="session-launch-copy">
                Active mandate: {formatSessionLabel(activeSession.session_name, activeSession.turn)}.
              </p>
            )}
          </div>
        </details>
      </div>

      {(statusMessage || sessionStore.error) && (
        <div className="action-config-validation" role="alert">
          {statusMessage ?? sessionStore.error}
        </div>
      )}

      {!requiresEntryChoice && (
        <div className="action-config-review-actions">
          <button type="button" className="action-config-secondary" onClick={closeModal}>
            Close
          </button>
        </div>
      )}
    </div>
  )
}
