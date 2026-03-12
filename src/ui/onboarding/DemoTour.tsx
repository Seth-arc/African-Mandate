import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTour } from '../../tour/TourContext'

interface FocusBox {
  top: number
  left: number
  width: number
  height: number
}

interface FloatingPosition {
  top: number
  left: number
}

const WAVEFORM_BARS = Array.from({ length: 52 }, (_, index) => index)

function idleWaveScale(index: number): number {
  const band = index % 6
  return 0.32 + band * 0.08
}

export function DemoTourOverlay(): ReactNode {
  const { isOpen, step, steps, currentStep, prev, next, skip } = useTour()
  const [focusBox, setFocusBox] = useState<FocusBox | null>(null)
  const [floatingPosition, setFloatingPosition] = useState<FloatingPosition | null>(null)
  const [audioIsPlaying, setAudioIsPlaying] = useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const dialogWrapRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformBarRefs = useRef<Array<HTMLSpanElement | null>>([])
  const waveformScaleCacheRef = useRef<number[]>(WAVEFORM_BARS.map((index) => idleWaveScale(index)))
  const waveformFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const shouldFloatDialog = step > 0 && focusBox !== null

  const applyWaveScales = (scales: number[]): void => {
    for (let index = 0; index < WAVEFORM_BARS.length; index += 1) {
      const bar = waveformBarRefs.current[index]
      if (!bar) continue
      const scale = scales[index] ?? idleWaveScale(index)
      const clampedScale = Math.max(0.22, Math.min(2.05, scale))
      const opacity = Math.max(0.42, Math.min(1, 0.34 + clampedScale * 0.34))
      bar.style.setProperty('--wave-scale', clampedScale.toFixed(3))
      bar.style.setProperty('--wave-opacity', opacity.toFixed(3))
    }
  }

  const resetWaveformBars = (): void => {
    const idleScales = WAVEFORM_BARS.map((index) => idleWaveScale(index))
    waveformScaleCacheRef.current = idleScales
    applyWaveScales(idleScales)
  }

  const stopWaveformLoop = (): void => {
    if (typeof window === 'undefined') return
    if (waveformFrameRef.current === null) return
    window.cancelAnimationFrame(waveformFrameRef.current)
    waveformFrameRef.current = null
  }

  const ensureAnalyser = (audioElement: HTMLAudioElement): boolean => {
    if (typeof window === 'undefined') return false
    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return false

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContextCtor()
    }
    const context = audioContextRef.current
    if (!context) return false

    if (!analyserRef.current) {
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.78
      analyser.minDecibels = -92
      analyser.maxDecibels = -18
      analyser.connect(context.destination)
      analyserRef.current = analyser
    }
    const analyser = analyserRef.current

    const existingSource = sourceNodeRef.current
    if (!existingSource || existingSource.mediaElement !== audioElement) {
      existingSource?.disconnect()
      const source = context.createMediaElementSource(audioElement)
      source.connect(analyser)
      sourceNodeRef.current = source
    }

    if (!analyserDataRef.current || analyserDataRef.current.length !== analyser.frequencyBinCount) {
      analyserDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
    }

    return true
  }

  const renderWaveformFrame = (): void => {
    if (typeof window === 'undefined') return

    const audioElement = audioRef.current
    const analyser = analyserRef.current
    const data = analyserDataRef.current
    if (!audioElement || !analyser || !data || audioElement.paused || audioElement.ended) {
      stopWaveformLoop()
      resetWaveformBars()
      return
    }

    analyser.getByteFrequencyData(data)
    const scales = waveformScaleCacheRef.current
    const barCount = WAVEFORM_BARS.length
    const activeBinCount = Math.max(12, Math.floor(data.length * 0.88))

    for (let index = 0; index < barCount; index += 1) {
      const start = Math.floor((index / barCount) * activeBinCount)
      const end = Math.max(start + 1, Math.floor(((index + 1) / barCount) * activeBinCount))
      let sum = 0
      for (let bin = start; bin < end; bin += 1) {
        sum += data[bin] ?? 0
      }
      const average = sum / (end - start)
      const normalized = Math.min(1, average / 255)
      const weighted = Math.pow(normalized, 0.78)
      const target = 0.24 + weighted * 1.78
      const previous = scales[index] ?? idleWaveScale(index)
      scales[index] = previous * 0.62 + target * 0.38
    }

    applyWaveScales(scales)
    waveformFrameRef.current = window.requestAnimationFrame(renderWaveformFrame)
  }

  const startWaveformLoop = (): void => {
    if (typeof window === 'undefined') return
    if (waveformFrameRef.current !== null) return
    waveformFrameRef.current = window.requestAnimationFrame(renderWaveformFrame)
  }

  const formatAudioTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
    const totalSeconds = Math.floor(seconds)
    const minutes = Math.floor(totalSeconds / 60)
    const remainder = totalSeconds % 60
    return `${minutes}:${String(remainder).padStart(2, '0')}`
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        skip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, skip])

  useLayoutEffect(() => {
    const selector = currentStep?.focusSelector
    if (!isOpen || !selector || typeof window === 'undefined') {
      setFocusBox(null)
      return
    }

    setFocusBox(null)

    const updateFocus = (): void => {
      const target = document.querySelector(selector)
      if (!(target instanceof HTMLElement)) {
        setFocusBox(null)
        return
      }

      const rect = target.getBoundingClientRect()
      const pad = 7
      setFocusBox({
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      })
    }

    updateFocus()
    const raf = window.requestAnimationFrame(updateFocus)
    const syncInterval = window.setInterval(updateFocus, 220)
    window.addEventListener('resize', updateFocus)
    window.addEventListener('scroll', updateFocus, true)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearInterval(syncInterval)
      window.removeEventListener('resize', updateFocus)
      window.removeEventListener('scroll', updateFocus, true)
    }
  }, [currentStep?.focusSelector, currentStep?.path, isOpen, step])

  useLayoutEffect(() => {
    if (!isOpen) return
    if (!shouldFloatDialog || !focusBox || typeof window === 'undefined') {
      setFloatingPosition(null)
      return
    }

    const computeFloatingPosition = (): void => {
      const dialogElement = dialogWrapRef.current
      if (!dialogElement) return

      const viewportMargin = 16
      const focusGap = 14
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const dialogRect = dialogElement.getBoundingClientRect()
      const dialogWidth = Math.min(dialogRect.width || viewportWidth - viewportMargin * 2, viewportWidth - viewportMargin * 2)
      const dialogHeight = Math.min(dialogRect.height || 360, viewportHeight - viewportMargin * 2)
      const focusCenterX = focusBox.left + focusBox.width / 2

      let left = focusCenterX - dialogWidth / 2
      left = Math.max(viewportMargin, Math.min(left, viewportWidth - dialogWidth - viewportMargin))

      const belowTop = focusBox.top + focusBox.height + focusGap
      const aboveTop = focusBox.top - dialogHeight - focusGap
      const centeredTop = Math.max(
        viewportMargin,
        Math.min(focusBox.top + focusBox.height / 2 - dialogHeight / 2, viewportHeight - dialogHeight - viewportMargin)
      )

      let top = belowTop
      if (belowTop + dialogHeight <= viewportHeight - viewportMargin) {
        top = belowTop
      } else if (aboveTop >= viewportMargin) {
        top = aboveTop
      } else {
        const rightSideLeft = focusBox.left + focusBox.width + focusGap
        const leftSideLeft = focusBox.left - dialogWidth - focusGap

        if (rightSideLeft + dialogWidth <= viewportWidth - viewportMargin) {
          left = rightSideLeft
          top = centeredTop
        } else if (leftSideLeft >= viewportMargin) {
          left = leftSideLeft
          top = centeredTop
        } else {
          top = Math.max(viewportMargin, Math.min(belowTop, viewportHeight - dialogHeight - viewportMargin))
        }
      }

      setFloatingPosition((current) => {
        if (current && Math.abs(current.top - top) < 0.5 && Math.abs(current.left - left) < 0.5) {
          return current
        }
        return { top, left }
      })
    }

    computeFloatingPosition()
    const raf = window.requestAnimationFrame(computeFloatingPosition)
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            window.requestAnimationFrame(computeFloatingPosition)
          })
        : null
    if (resizeObserver && dialogWrapRef.current) {
      resizeObserver.observe(dialogWrapRef.current)
    }
    window.addEventListener('resize', computeFloatingPosition)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', computeFloatingPosition)
      resizeObserver?.disconnect()
    }
  }, [focusBox, isOpen, shouldFloatDialog, step])

  useEffect(() => {
    if (!isOpen) {
      setAudioIsPlaying(false)
      setAudioCurrentTime(0)
      setAudioDuration(0)
      stopWaveformLoop()
      resetWaveformBars()
      return
    }

    setAudioIsPlaying(false)
    setAudioCurrentTime(0)
    setAudioDuration(0)
    stopWaveformLoop()
    resetWaveformBars()
    const audioElement = audioRef.current
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }
  }, [isOpen, step])

  useEffect(() => {
    return () => {
      stopWaveformLoop()
      sourceNodeRef.current?.disconnect()
      analyserRef.current?.disconnect()
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close().catch(() => undefined)
      }
    }
  }, [])

  const toggleAudioPlayback = (): void => {
    const audioElement = audioRef.current
    if (!audioElement) return
    if (audioElement.paused) {
      audioElement.play().catch(() => {
        setAudioIsPlaying(false)
      })
      return
    }
    audioElement.pause()
  }

  const handleSeek = (event: ChangeEvent<HTMLInputElement>): void => {
    const audioElement = audioRef.current
    const nextTime = Number(event.target.value)
    if (!Number.isFinite(nextTime)) return
    setAudioCurrentTime(nextTime)
    if (audioElement) {
      audioElement.currentTime = nextTime
    }
  }

  const handleAudioPlay = (): void => {
    setAudioIsPlaying(true)
    const audioElement = audioRef.current
    if (!audioElement) return
    if (!ensureAnalyser(audioElement)) return
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume().catch(() => undefined)
    }
    startWaveformLoop()
  }

  const handleAudioPause = (): void => {
    setAudioIsPlaying(false)
    stopWaveformLoop()
    resetWaveformBars()
  }

  if (!isOpen || !currentStep) return null

  const headingId = 'demo-tour-title'
  const bodyId = 'demo-tour-body'
  const isLast = step === steps.length - 1
  const canGoBack = step > 0
  const hasBriefingMedia =
    Boolean(currentStep.avatarSrc) || Boolean(currentStep.audioSrc) || Boolean(currentStep.audioLabel) || Boolean(currentStep.audioPendingText)
  const audioMax = audioDuration > 0 ? audioDuration : 1
  const audioValue = Math.max(0, Math.min(audioCurrentTime, audioMax))
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight
  const focusTop = focusBox ? Math.max(0, Math.min(viewportHeight, focusBox.top)) : 0
  const focusLeft = focusBox ? Math.max(0, Math.min(viewportWidth, focusBox.left)) : 0
  const focusWidth = focusBox ? Math.max(0, Math.min(viewportWidth - focusLeft, focusBox.width)) : 0
  const focusHeight = focusBox ? Math.max(0, Math.min(viewportHeight - focusTop, focusBox.height)) : 0
  const focusRight = focusLeft + focusWidth
  const focusBottom = focusTop + focusHeight
  const floatingDialogStyle =
    shouldFloatDialog
      ? floatingPosition
        ? { top: `${floatingPosition.top}px`, left: `${floatingPosition.left}px` }
        : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      : undefined

  return (
    <div className="demo-tour-root">
      {focusBox ? (
        <>
          <div className="demo-tour-backdrop-fragment" aria-hidden="true" onClick={skip} style={{ top: 0, left: 0, width: '100vw', height: `${focusTop}px` }} />
          <div className="demo-tour-backdrop-fragment" aria-hidden="true" onClick={skip} style={{ top: `${focusTop}px`, left: 0, width: `${focusLeft}px`, height: `${focusHeight}px` }} />
          <div className="demo-tour-backdrop-fragment" aria-hidden="true" onClick={skip} style={{ top: `${focusTop}px`, left: `${focusRight}px`, width: `${Math.max(0, viewportWidth - focusRight)}px`, height: `${focusHeight}px` }} />
          <div className="demo-tour-backdrop-fragment" aria-hidden="true" onClick={skip} style={{ top: `${focusBottom}px`, left: 0, width: '100vw', height: `${Math.max(0, viewportHeight - focusBottom)}px` }} />
        </>
      ) : (
        <div className="demo-tour-backdrop" aria-hidden="true" onClick={skip} />
      )}
      {focusBox && (
        <div
          className="demo-tour-focus"
          aria-hidden="true"
          style={{
            top: `${focusBox.top}px`,
            left: `${focusBox.left}px`,
            width: `${focusBox.width}px`,
            height: `${focusBox.height}px`,
          }}
        />
      )}
      <div
        ref={dialogWrapRef}
        className={`demo-tour-dialog-wrap${shouldFloatDialog ? ' is-floating' : ''}`}
        style={floatingDialogStyle}
      >
        <section
          className="demo-tour-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          aria-describedby={bodyId}
        >
          <div className="demo-tour-steps" aria-hidden="true">
            {steps.map((tourStep, index) => {
              const stateClass = index === step ? 'active' : index < step ? 'complete' : 'pending'
              return (
                <span
                  key={tourStep.path}
                  className={`demo-tour-step-dot ${stateClass}`}
                  title={tourStep.title}
                />
              )
            })}
          </div>
          <h2 id={headingId} className="demo-tour-title">
            {currentStep.title}
          </h2>
          <div className="demo-tour-route">
            {currentStep.focusLabel ?? 'Gameplay surface'}
          </div>
          {hasBriefingMedia && (
            <div className="demo-tour-briefing-row">
              {currentStep.avatarSrc && (
                <figure className="demo-tour-avatar-frame">
                  <img className="demo-tour-avatar" src={currentStep.avatarSrc} alt={currentStep.avatarAlt ?? currentStep.title} />
                </figure>
              )}
              {(currentStep.audioSrc || currentStep.audioLabel || currentStep.audioPendingText) && (
                <div className="demo-tour-audio-wrap">
                  {currentStep.audioLabel && <div className="demo-tour-audio-label">{currentStep.audioLabel}</div>}
                  {currentStep.audioSrc ? (
                    <>
                      <div className={`demo-tour-waveform${audioIsPlaying ? ' is-playing' : ''}`} aria-hidden="true">
                        {WAVEFORM_BARS.map((bar) => (
                          <span
                            key={`tour-wave-${bar}`}
                            ref={(node) => {
                              waveformBarRefs.current[bar] = node
                              if (!node) return
                              const scale = waveformScaleCacheRef.current[bar] ?? idleWaveScale(bar)
                              node.style.setProperty('--wave-scale', scale.toFixed(3))
                              node.style.setProperty('--wave-opacity', '0.6')
                            }}
                          />
                        ))}
                      </div>
                      <div className="demo-tour-audio-controls">
                        <button type="button" className="demo-tour-audio-control-btn" onClick={toggleAudioPlayback}>
                          {audioIsPlaying ? 'Pause' : 'Play'}
                        </button>
                        <div className="demo-tour-audio-timeline">
                          <input
                            className="demo-tour-audio-seek"
                            type="range"
                            min={0}
                            max={audioMax}
                            step={0.1}
                            value={audioValue}
                            onChange={handleSeek}
                            aria-label="Audio timeline"
                          />
                          <div className="demo-tour-audio-time">[{formatAudioTime(audioCurrentTime)}/{formatAudioTime(audioDuration)}]</div>
                        </div>
                      </div>
                      <audio
                        ref={audioRef}
                        className="demo-tour-audio-native"
                        preload="metadata"
                        controlsList="nodownload noplaybackrate"
                        onContextMenu={(event) => event.preventDefault()}
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        onEnded={handleAudioPause}
                        onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime)}
                        onLoadedMetadata={(event) => setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
                        onDurationChange={(event) => setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
                      >
                        <source src={currentStep.audioSrc} type="audio/mpeg" />
                      </audio>
                    </>
                  ) : (
                    <div className="demo-tour-audio-pending">
                      {currentStep.audioPendingText ?? 'Audio message pending upload.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <p id={bodyId} className="demo-tour-body">
            {currentStep.body}
          </p>
          <div className="demo-tour-actions">
            <div className="demo-tour-actions-left">
              <button type="button" className="demo-tour-btn secondary" onClick={prev} disabled={!canGoBack}>
                Back
              </button>
            </div>
            <div className="demo-tour-actions-right">
              <button type="button" className="demo-tour-btn secondary" onClick={skip}>
                Skip
              </button>
              <button type="button" className="demo-tour-btn primary" onClick={next}>
                {isLast ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
          <div className="demo-tour-hint">Press Esc to close onboarding</div>
        </section>
      </div>
    </div>
  )
}
