/**
 * Execute a deferred UI command while guaranteeing that its pending-state
 * cleanup runs even when the deterministic command throws.
 */
export function runCommandSafely(
  run: () => void,
  onFailure: (error: unknown) => void,
  onSettled: () => void
): void {
  try {
    run()
  } catch (error: unknown) {
    onFailure(error)
  } finally {
    onSettled()
  }
}
