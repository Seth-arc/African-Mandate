import { describe, expect, it } from 'vitest'
import { useGameStore, validateContentConsistency } from '../../src/state/gameStore'
import type { GameContent } from '../../src/state/types'

function loadedContent(): GameContent {
  const content = useGameStore.getState().state.content
  if (!content) {
    throw new Error('Expected game content to load')
  }
  return content
}

describe('game content validation', () => {
  it('accepts shipped authored action conditions during content load', () => {
    expect(() => validateContentConsistency(loadedContent())).not.toThrow()
  })

  it('rejects unsupported authored action conditions during content load', () => {
    const content = loadedContent()
    const invalid: GameContent = {
      ...content,
      actions: {
        ...content.actions,
        actions: content.actions.actions.map((action, index) =>
          index === 0
            ? {
                ...action,
                requirements: {
                  ...(action.requirements ?? {}),
                  condition: 'unknown_flag == true',
                },
              }
            : action
        ),
      },
    }

    expect(() => validateContentConsistency(invalid)).toThrow(/Unsupported action condition path/)
  })
})
