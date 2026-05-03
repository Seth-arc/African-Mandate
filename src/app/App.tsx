import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { GameLayout } from '../ui/layout/GameLayout'
import { DemoTourOverlay } from '../ui/onboarding/DemoTour'
import { useGameStore } from '../state/gameStore'
import { useTour } from '../tour/TourContext'
import { useSessionStore } from '../state/sessionStore'
import { useUiStore } from '../state/uiStore'
import { recordTelemetryEvent } from '../utils/telemetry'

type AppReadyWindow = Window & { __africanMandateAppReady?: boolean }

function App(): ReactNode {
  const initialize = useSessionStore((s) => s.initialize)
  const dispose = useSessionStore((s) => s.dispose)
  const beginEntryGate = useSessionStore((s) => s.beginEntryGate)
  const entryGateActive = useSessionStore((s) => s.entry_gate_active)
  const entryGateConfirmed = useSessionStore((s) => s.entry_gate_confirmed)
  const entryLaunchKind = useSessionStore((s) => s.entry_launch_kind)
  const difficultyMode = useGameStore((s) => s.state.difficulty_mode ?? 'standard')
  const { start: startTour, isOpen: isTourOpen } = useTour()
  const openModal = useUiStore((s) => s.openModal)
  const modal = useUiStore((s) => s.modal)
  const [entryFlowPending, setEntryFlowPending] = useState(false)
  const [interfaceRevealActive, setInterfaceRevealActive] = useState(false)
  const autoTourTriggeredRef = useRef(false)
  const autoTourTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const interfaceRevealTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const previousModalRef = useRef(modal)

  useEffect(() => {
    void initialize()
    return () => {
      dispose()
    }
  }, [dispose, initialize])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const w = window as AppReadyWindow
    w.__africanMandateAppReady = true
    window.dispatchEvent(new Event('african-mandate:app-ready'))

    const handleStartFlow = (): void => {
      recordTelemetryEvent('funnel_entry_started', {
        source: 'landing_start_flow',
      })
      if (autoTourTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(autoTourTimerRef.current)
        autoTourTimerRef.current = null
      }
      if (interfaceRevealTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(interfaceRevealTimerRef.current)
        interfaceRevealTimerRef.current = null
      }
      setInterfaceRevealActive(false)
      autoTourTriggeredRef.current = false
      beginEntryGate()
      setEntryFlowPending(true)
      openModal('session_manager')
    }

    window.addEventListener('african-mandate:start-flow', handleStartFlow)
    return () => {
      window.removeEventListener('african-mandate:start-flow', handleStartFlow)
    }
  }, [beginEntryGate, openModal])

  useEffect(() => {
    if (!entryGateActive || entryGateConfirmed) return
    if (modal !== 'none') return
    openModal('session_manager')
  }, [entryGateActive, entryGateConfirmed, modal, openModal])

  useEffect(() => {
    if (!entryFlowPending) return
    if (modal !== 'onboarding_loading') return
    recordTelemetryEvent('funnel_onboarding_loading_started', {
      launch_kind: entryLaunchKind ?? 'unknown',
    })
    if (typeof window === 'undefined') {
      setEntryFlowPending(false)
      return
    }
    const frame = window.requestAnimationFrame(() => {
      setEntryFlowPending(false)
    })
    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [entryFlowPending, entryLaunchKind, modal])

  const preEntryFlowVeilActive =
    typeof document !== 'undefined' &&
    document.body.classList.contains('game-active') &&
    !entryGateActive &&
    modal === 'none'
  const entryFlowVeilActive = preEntryFlowVeilActive || (entryFlowPending && modal !== 'onboarding_loading')

  useEffect(() => {
    const previousModal = previousModalRef.current
    if (previousModal === 'onboarding_loading' && modal === 'none') {
      setInterfaceRevealActive(true)
      if (interfaceRevealTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(interfaceRevealTimerRef.current)
      }
      if (typeof window !== 'undefined') {
        interfaceRevealTimerRef.current = window.setTimeout(() => {
          setInterfaceRevealActive(false)
          interfaceRevealTimerRef.current = null
        }, 760)
      }
    } else if (modal !== 'none') {
      setInterfaceRevealActive(false)
      if (interfaceRevealTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(interfaceRevealTimerRef.current)
        interfaceRevealTimerRef.current = null
      }
    }
    previousModalRef.current = modal
  }, [modal])

  useEffect(() => {
    if (!entryGateActive || !entryGateConfirmed) return
    if (entryFlowPending) return
    if (entryLaunchKind !== 'new') return
    if (difficultyMode !== 'narrative') return
    if (modal !== 'none') return
    if (interfaceRevealActive) return
    if (isTourOpen) return
    if (autoTourTriggeredRef.current) return

    autoTourTriggeredRef.current = true
    if (typeof window === 'undefined') {
      startTour(0)
      return
    }

    if (autoTourTimerRef.current) {
      window.clearTimeout(autoTourTimerRef.current)
    }
    autoTourTimerRef.current = window.setTimeout(() => {
      autoTourTimerRef.current = null
      const sessionState = useSessionStore.getState()
      const uiState = useUiStore.getState()
      if (
        sessionState.entry_gate_active &&
        sessionState.entry_gate_confirmed &&
        sessionState.entry_launch_kind === 'new' &&
        useGameStore.getState().state.difficulty_mode === 'narrative' &&
        uiState.modal === 'none'
      ) {
        startTour(0)
        return
      }
      autoTourTriggeredRef.current = false
    }, 760)
  }, [
    difficultyMode,
    entryFlowPending,
    entryGateActive,
    entryGateConfirmed,
    entryLaunchKind,
    interfaceRevealActive,
    isTourOpen,
    modal,
    startTour,
  ])

  useEffect(() => {
    return () => {
      if (autoTourTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(autoTourTimerRef.current)
        autoTourTimerRef.current = null
      }
      if (interfaceRevealTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(interfaceRevealTimerRef.current)
        interfaceRevealTimerRef.current = null
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <>
        <GameLayout />
        <div className={`entry-flow-veil${entryFlowVeilActive ? ' is-active' : ''}`} aria-hidden="true" />
        <div className={`interface-reveal-veil${interfaceRevealActive ? ' is-active' : ''}`} aria-hidden="true" />
        <DemoTourOverlay />
      </>
    </ErrorBoundary>
  )
}

export default App
