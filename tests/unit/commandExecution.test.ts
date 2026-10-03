/**
 * Unit tests for deferred command cleanup.
 * Sources:
 * - src/ui/commandExecution.ts
 * - dev_docs/CONTROLLED_DESKTOP_DEMO_CLOSURE_PROMPT_BOOK.md, Prompt 2
 */
import { describe, expect, it, vi } from 'vitest'
import { runCommandSafely } from '../../src/ui/commandExecution'

describe('runCommandSafely', () => {
  it('releases pending command state after a successful command', () => {
    const run = vi.fn()
    const onFailure = vi.fn()
    const onSettled = vi.fn()

    runCommandSafely(run, onFailure, onSettled)

    expect(run).toHaveBeenCalledOnce()
    expect(onFailure).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledOnce()
  })

  it('reports a thrown command and still releases pending command state', () => {
    const failure = new Error('synthetic turn failure')
    const onFailure = vi.fn()
    const onSettled = vi.fn()

    runCommandSafely(
      () => {
        throw failure
      },
      onFailure,
      onSettled
    )

    expect(onFailure).toHaveBeenCalledWith(failure)
    expect(onSettled).toHaveBeenCalledOnce()
  })
})
