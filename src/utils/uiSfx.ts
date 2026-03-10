export type UiSfxKey =
  | 'active_button_hover'
  | 'active_button_click'
  | 'modal_open'
  | 'modal_close'

const UI_SFX_SOURCES: Record<UiSfxKey, string[]> = {
  active_button_hover: ['/assets/audio/effects/active_button_hover.wav'],
  active_button_click: [
    '/assets/audio/effects/select_click.mp3',
    '/assets/audio/effects/active_button_hover.wav',
  ],
  modal_open: ['/assets/audio/effects/swipe-255512.mp3'],
  modal_close: ['/assets/audio/effects/whoosh-07-410877.mp3'],
}

const UI_SFX_VOLUMES: Record<UiSfxKey, number> = {
  active_button_hover: 0.34,
  active_button_click: 0.42,
  modal_open: 0.4,
  modal_close: 0.4,
}

const UI_SFX_GLOBAL_VOLUME_SCALE = 0.6
const HTML_AUDIO_POOL_SIZE = 3

const UI_SFX_MIN_INTERVAL_MS: Record<UiSfxKey, number> = {
  active_button_hover: 55,
  active_button_click: 70,
  modal_open: 90,
  modal_close: 90,
}

const resolvedSourceByKey: Partial<Record<UiSfxKey, string>> = {}
const lastPlayedAtByKey: Partial<Record<UiSfxKey, number>> = {}
const htmlAudioPoolBySrc: Record<string, HTMLAudioElement[]> = {}
const decodedBufferByKey: Partial<Record<UiSfxKey, AudioBuffer>> = {}
const decodePromiseByKey: Partial<Record<UiSfxKey, Promise<AudioBuffer | null>>> = {}

let audioContextRef: AudioContext | null = null
let unlockListenersInstalled = false

function canPlayAudio(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function mediaTypeForSource(src: string): string | null {
  const [head] = src.split('?')
  const clean = head ?? src
  const dotIndex = clean.lastIndexOf('.')
  if (dotIndex === -1) return null
  const ext = clean.slice(dotIndex + 1).toLowerCase()
  if (ext === 'mp3') return 'audio/mpeg'
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'ogg') return 'audio/ogg; codecs=vorbis'
  return null
}

function sourceSupportScore(src: string): number {
  if (!canPlayAudio()) return 0
  const mediaType = mediaTypeForSource(src)
  if (!mediaType) return 1
  const probe = new Audio()
  const support = probe.canPlayType(mediaType)
  if (support === 'probably') return 3
  if (support === 'maybe') return 2
  return 0
}

function orderedCandidates(key: UiSfxKey): string[] {
  return UI_SFX_SOURCES[key]
    .slice()
    .sort((a, b) => sourceSupportScore(b) - sourceSupportScore(a))
}

function getAudioContext(): AudioContext | null {
  if (!canPlayAudio()) return null
  if (audioContextRef) return audioContextRef

  const audioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!audioContextCtor) return null

  try {
    audioContextRef = new audioContextCtor()
  } catch {
    audioContextRef = null
  }
  return audioContextRef
}

async function unlockAudioContext(): Promise<void> {
  const context = getAudioContext()
  if (!context) return
  if (context.state === 'running') return

  try {
    await context.resume()
  } catch {
    return
  }

  if (String(context.state) !== 'running') return

  try {
    const gain = context.createGain()
    gain.gain.value = 0
    gain.connect(context.destination)

    const oscillator = context.createOscillator()
    oscillator.frequency.value = 1
    oscillator.connect(gain)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.01)
  } catch {
    // Best effort unlock only.
  }
}

function installUnlockListeners(): void {
  if (unlockListenersInstalled || typeof window === 'undefined') return
  unlockListenersInstalled = true

  const unlock = (): void => {
    void unlockAudioContext()
  }

  window.addEventListener('pointerdown', unlock, { capture: true, once: true, passive: true })
  window.addEventListener('touchstart', unlock, { capture: true, once: true, passive: true })
  window.addEventListener('mousedown', unlock, { capture: true, once: true, passive: true })
  window.addEventListener('keydown', unlock, { capture: true, once: true })
}

function getHtmlAudioPool(src: string): HTMLAudioElement[] {
  const existing = htmlAudioPoolBySrc[src]
  if (existing) return existing

  const pool: HTMLAudioElement[] = []
  for (let index = 0; index < HTML_AUDIO_POOL_SIZE; index += 1) {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.setAttribute('playsinline', 'true')
    pool.push(audio)
  }
  htmlAudioPoolBySrc[src] = pool
  return pool
}

function attemptHtmlAudioPlay(
  key: UiSfxKey,
  candidates: readonly string[],
  startIndex: number
): void {
  if (!canPlayAudio()) return
  if (startIndex >= candidates.length) return

  const src = candidates[startIndex]
  if (!src) return
  const pool = getHtmlAudioPool(src)
  const audio = pool.find((item) => item.paused || item.ended) ?? pool[0]
  if (!audio) return
  audio.volume = clamp01(UI_SFX_VOLUMES[key] * UI_SFX_GLOBAL_VOLUME_SCALE)
  try {
    audio.currentTime = 0
  } catch {
    // Not seekable yet; try playback anyway.
  }

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
      attemptHtmlAudioPlay(key, candidates, startIndex + 1)
    })
}

function decodeAudioBufferSafe(context: AudioContext, rawData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finishResolve = (buffer: AudioBuffer): void => {
      if (settled) return
      settled = true
      resolve(buffer)
    }
    const finishReject = (error: unknown): void => {
      if (settled) return
      settled = true
      reject(error)
    }

    try {
      const decodeResult = context.decodeAudioData(
        rawData.slice(0),
        (buffer) => finishResolve(buffer),
        (error) => finishReject(error)
      )
      if (decodeResult && typeof (decodeResult as Promise<AudioBuffer>).then === 'function') {
        void (decodeResult as Promise<AudioBuffer>)
          .then((buffer) => finishResolve(buffer))
          .catch((error) => finishReject(error))
      }
    } catch (error) {
      finishReject(error)
    }
  })
}

function warmDecodedBuffer(key: UiSfxKey): void {
  if (decodedBufferByKey[key]) return
  if (decodePromiseByKey[key]) return

  const context = getAudioContext()
  if (!context) return

  const candidates = orderedCandidates(key)
  decodePromiseByKey[key] = (async () => {
    for (const src of candidates) {
      try {
        const response = await fetch(src, { cache: 'force-cache' })
        if (!response.ok) continue
        const rawData = await response.arrayBuffer()
        const decodedBuffer = await decodeAudioBufferSafe(context, rawData)
        decodedBufferByKey[key] = decodedBuffer
        resolvedSourceByKey[key] = src
        return decodedBuffer
      } catch {
        // Try next candidate source.
      }
    }
    return null
  })()

  void decodePromiseByKey[key]!.finally(() => {
    delete decodePromiseByKey[key]
  })
}

function playWithWebAudioBuffer(key: UiSfxKey, buffer: AudioBuffer): boolean {
  const context = getAudioContext()
  if (!context) return false
  if (context.state !== 'running') {
    void context.resume()
    return false
  }

  try {
    const source = context.createBufferSource()
    source.buffer = buffer
    const gain = context.createGain()
    gain.gain.value = clamp01(UI_SFX_VOLUMES[key] * UI_SFX_GLOBAL_VOLUME_SCALE)
    source.connect(gain)
    gain.connect(context.destination)
    source.start(0)
    return true
  } catch {
    return false
  }
}

export function playUiSfx(key: UiSfxKey): void {
  if (!canPlayAudio()) return

  installUnlockListeners()
  void unlockAudioContext()

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const minimumInterval = UI_SFX_MIN_INTERVAL_MS[key]
  const lastPlayedAt = lastPlayedAtByKey[key] ?? 0
  if (now - lastPlayedAt < minimumInterval) return
  lastPlayedAtByKey[key] = now

  const decoded = decodedBufferByKey[key]
  if (decoded && playWithWebAudioBuffer(key, decoded)) return

  const preferredCandidates = orderedCandidates(key)
  const resolved = resolvedSourceByKey[key]
  const candidates = resolved
    ? [resolved, ...preferredCandidates.filter((source) => source !== resolved)]
    : preferredCandidates

  attemptHtmlAudioPlay(key, candidates, 0)
  warmDecodedBuffer(key)
}
