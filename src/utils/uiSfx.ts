export type UiSfxKey = 'active_button_hover' | 'modal_open' | 'modal_close'

const UI_SFX_SOURCES: Record<UiSfxKey, string[]> = {
  active_button_hover: [
    '/assets/audio/effects/active_button_hover.mp3',
    '/assets/audio/effects/active_button_hover.wav',
  ],
  modal_open: ['/assets/audio/effects/swipe-255512.mp3'],
  modal_close: ['/assets/audio/effects/whoosh-07-410877.mp3'],
}

const UI_SFX_VOLUMES: Record<UiSfxKey, number> = {
  active_button_hover: 0.34,
  modal_open: 0.4,
  modal_close: 0.4,
}
const UI_SFX_GLOBAL_VOLUME_SCALE = 0.6

const UI_SFX_MIN_INTERVAL_MS: Record<UiSfxKey, number> = {
  active_button_hover: 55,
  modal_open: 90,
  modal_close: 90,
}

const resolvedSourceByKey: Partial<Record<UiSfxKey, string>> = {}
const lastPlayedAtByKey: Partial<Record<UiSfxKey, number>> = {}

function canPlayAudio(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

function attemptPlay(
  key: UiSfxKey,
  candidates: readonly string[],
  startIndex: number
): void {
  if (!canPlayAudio()) return
  if (startIndex >= candidates.length) return

  const src = candidates[startIndex]
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.volume = Math.max(0, Math.min(1, UI_SFX_VOLUMES[key] * UI_SFX_GLOBAL_VOLUME_SCALE))

  const playPromise = audio.play()
  if (!playPromise || typeof playPromise.then !== 'function') {
    resolvedSourceByKey[key] = src
    return
  }

  void playPromise
    .then(() => {
      resolvedSourceByKey[key] = src
    })
    .catch(() => {
      attemptPlay(key, candidates, startIndex + 1)
    })
}

export function playUiSfx(key: UiSfxKey): void {
  if (!canPlayAudio()) return

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const minimumInterval = UI_SFX_MIN_INTERVAL_MS[key]
  const lastPlayedAt = lastPlayedAtByKey[key] ?? 0
  if (now - lastPlayedAt < minimumInterval) return
  lastPlayedAtByKey[key] = now

  const resolved = resolvedSourceByKey[key]
  if (resolved) {
    attemptPlay(key, [resolved], 0)
    return
  }

  attemptPlay(key, UI_SFX_SOURCES[key], 0)
}
