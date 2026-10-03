import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import { advanceTurn } from '../../systems/turnEngine'
import { recordTelemetryEvent } from '../../utils/telemetry'
import { runCommandSafely } from '../commandExecution'
import { deriveOperationalPressure, formatDeadlineSignal } from '../operationalPressure'

export function ActionBar(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = useGameStore((s) => s.state.content)
  const actionsRemaining = state.session.actions_remaining
  const endingType = state.ending_type
  const openModal = useUiStore((s) => s.openModal)
  const setPendingTurnTransition = useUiStore((s) => s.setPendingTurnTransition)
  const [pendingCommand, setPendingCommand] = useState<'action' | 'turn' | null>(null)
  const [turnError, setTurnError] = useState<string | null>(null)
  const pendingCommandRef = useRef<'action' | 'turn' | null>(null)
  const pendingTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current)
      }
      pendingCommandRef.current = null
    },
    []
  )

  const releasePendingCommand = (): void => {
    pendingCommandRef.current = null
    setPendingCommand(null)
  }

  const queueCommand = (kind: 'action' | 'turn', delayMs: number, run: () => void): void => {
    if (pendingCommandRef.current !== null) return
    pendingCommandRef.current = kind
    setPendingCommand(kind)

    if (typeof window === 'undefined') {
      runCommandSafely(run, () => undefined, releasePendingCommand)
      return
    }

    pendingTimerRef.current = window.setTimeout(() => {
      pendingTimerRef.current = null
      runCommandSafely(
        run,
        (error) => {
          const message = error instanceof Error ? error.message : 'Unknown deferred command error'
          setTurnError('Command failed (COMMAND_EXECUTION_FAILED). No state was changed. Retry the command.')
          recordTelemetryEvent('e2e_critical_error', {
            surface: 'action_bar_command',
            command: kind,
            message,
          })
        },
        releasePendingCommand
      )
    }, delayMs)
  }

  const handleEndTurn = (): void => {
    if (pendingCommandRef.current !== null) return
    if (endingType) {
      openModal('campaign_outcome')
      return
    }
    setTurnError(null)
    queueCommand('turn', 520, () => {
      try {
        const currentState = useGameStore.getState().state
        const nextState = advanceTurn(currentState)
        setPendingTurnTransition({ nextState })
        openModal('turn_loading')
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown turn resolution error'
        setTurnError('Turn could not be resolved (TURN_RESOLUTION_FAILED). No state was changed. Retry End turn.')
        recordTelemetryEvent('e2e_critical_error', {
          surface: 'turn_resolution',
          turn: useGameStore.getState().state.session.turn,
          message,
        })
      }
    })
  }

  const hasActions = (content?.actions.actions.length ?? 0) > 0
  const canOpenActionModal = actionsRemaining > 0 && hasActions && !endingType && pendingCommand === null
  const pressure = deriveOperationalPressure(state)
  const deadlineSignal = formatDeadlineSignal(pressure.turnsToDeadline, pressure.nearestDeadlineTurn)
  const endTurnClassName = `game-action-btn end-turn${pressure.level === 'critical' ? ' is-urgent' : pressure.level === 'high' ? ' is-elevated' : ''}`
  const criticalZoneMeta =
    pressure.intelCriticalZoneAdditions > 0
      ? `${pressure.criticalZoneCount} (+${pressure.intelCriticalZoneAdditions} intel)`
      : `${pressure.criticalZoneCount}`

  const openActionConfig = (): void => {
    if (pendingCommandRef.current !== null) return
    setTurnError(null)
    queueCommand('action', 340, () => {
      openModal('action_config')
    })
  }

  return (
    <footer className={`game-action-bar pressure-${pressure.level}`} id="action-bar">
      <div className="game-action-pressure" aria-live="polite" data-ui-tooltip="action_bar.pressure">
        <div className="game-action-pressure-head">
          <span className={`game-action-pressure-pill is-${pressure.level}`}>{pressure.label} pressure</span>
          <span className="game-action-pressure-meta">
            Turns left {pressure.turnsRemaining} | Clock {pressure.timeMonthsRemaining}m | Critical zones {criticalZoneMeta}
          </span>
        </div>
        <div
          className="game-action-pressure-meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pressure.score}
          aria-label="Operational pressure"
        >
          <span className={`game-action-pressure-meter-fill is-${pressure.level}`} style={{ width: `${pressure.score}%` }} />
        </div>
        <p className="game-action-pressure-copy">{pressure.summary}</p>
      </div>
      <div className="game-action-controls">
        <button
          type="button"
          className="game-action-btn"
          id="btn-take-action"
          data-ui-tooltip="action_bar.take_action"
          disabled={!canOpenActionModal}
          onClick={openActionConfig}
        >
          Take action
        </button>
        <button
          type="button"
          className={endTurnClassName}
          id="btn-end-turn"
          data-ui-tooltip="action_bar.end_turn"
          disabled={pendingCommand !== null}
          onClick={handleEndTurn}
          aria-describedby={turnError ? 'turn-command-error' : undefined}
        >
          {endingType ? 'View outcome' : 'End turn'}
        </button>
        {pendingCommand !== null && (
          <span className="game-action-command-status">
            {pendingCommand === 'action' ? 'Routing command channel...' : 'Compiling turn orders...'}
          </span>
        )}
        {pendingCommand === null && !endingType && (
          <span className="game-action-command-status subtle">{deadlineSignal}</span>
        )}
        {endingType && <span className="game-text-muted">Campaign complete. Open outcome report.</span>}
        {!hasActions && <span className="game-text-muted">No actions loaded</span>}
        {turnError && (
          <span className="game-action-command-status is-error" id="turn-command-error" role="alert">
            {turnError}
          </span>
        )}
      </div>
    </footer>
  )
}
