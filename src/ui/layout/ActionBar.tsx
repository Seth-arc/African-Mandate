import type { ReactNode } from 'react'
import { useGameStore } from '../../state/gameStore'
import { useUiStore } from '../../state/uiStore'
import { advanceTurn } from '../../systems/turnEngine'
import { useSessionStore } from '../../state/sessionStore'

export function ActionBar(): ReactNode {
  const state = useGameStore((s) => s.state)
  const content = useGameStore((s) => s.state.content)
  const actionsRemaining = state.session.actions_remaining
  const endingType = state.ending_type
  const openModal = useUiStore((s) => s.openModal)
  const autosaveState = useSessionStore((s) => s.autosaveState)

  const handleEndTurn = (): void => {
    if (endingType) {
      openModal('campaign_outcome')
      return
    }
    const next = advanceTurn(state)
    useGameStore.setState({ state: next })
    void autosaveState(next, 'end_turn').catch(() => undefined)
  }

  const hasActions = (content?.actions.actions.length ?? 0) > 0
  const canOpenActionModal = actionsRemaining > 0 && hasActions && !endingType

  const openActionConfig = (): void => {
    openModal('action_config')
  }

  return (
    <footer className="game-action-bar" id="action-bar">
      <button
        type="button"
        className="game-action-btn"
        id="btn-take-action"
        disabled={!canOpenActionModal}
        onClick={openActionConfig}
      >
        Take action
      </button>
      <button
        type="button"
        className="game-action-btn end-turn"
        id="btn-end-turn"
        disabled={Boolean(endingType)}
        onClick={handleEndTurn}
      >
        End turn
      </button>
      {endingType && <span className="game-text-muted">Campaign complete. Open outcome report.</span>}
      {!hasActions && <span className="game-text-muted">No actions loaded</span>}
    </footer>
  )
}
