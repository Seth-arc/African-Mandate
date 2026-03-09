import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { GameLayout } from '../ui/layout/GameLayout'
import { useSessionStore } from '../state/sessionStore'
import { useUiStore } from '../state/uiStore'

const ONBOARDING_SEEN_KEY = 'african_mandate.onboarding_seen.v1'

type AppReadyWindow = Window & { __africanMandateAppReady?: boolean }

function App(): ReactNode {
  const initialize = useSessionStore((s) => s.initialize)
  const dispose = useSessionStore((s) => s.dispose)
  const beginEntryGate = useSessionStore((s) => s.beginEntryGate)
  const entryGateActive = useSessionStore((s) => s.entry_gate_active)
  const entryGateConfirmed = useSessionStore((s) => s.entry_gate_confirmed)
  const authMode = useSessionStore((s) => s.auth_mode)
  const openModal = useUiStore((s) => s.openModal)
  const closeModal = useUiStore((s) => s.closeModal)
  const modal = useUiStore((s) => s.modal)
  const [entryFlowPending, setEntryFlowPending] = useState(false)
  const onboardingTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

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
      beginEntryGate()
      openModal('session_manager')
      setEntryFlowPending(true)
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
    if (!entryGateConfirmed) return
    if (modal !== 'session_manager') return
    closeModal()
  }, [entryFlowPending, entryGateConfirmed, modal, closeModal])

  useEffect(() => {
    if (!entryFlowPending) return
    if (!entryGateConfirmed) return
    if (modal !== 'none') return

    const onboardingSeen =
      typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_SEEN_KEY) === '1'
    const shouldLaunchOnboarding = authMode === 'guest' || !onboardingSeen
    setEntryFlowPending(false)
    if (!shouldLaunchOnboarding) return

    openModal('onboarding_loading')
    if (typeof window === 'undefined') return
    if (onboardingTimerRef.current) {
      window.clearTimeout(onboardingTimerRef.current)
    }
    onboardingTimerRef.current = window.setTimeout(() => {
      openModal('mission_brief')
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
      onboardingTimerRef.current = null
    }, 2900)
  }, [authMode, entryFlowPending, entryGateConfirmed, modal, openModal])

  useEffect(() => {
    return () => {
      if (onboardingTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(onboardingTimerRef.current)
      }
    }
  }, [])

  return (
    <ErrorBoundary>
      <GameLayout />
    </ErrorBoundary>
  )
}

export default App
