import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export interface TourStep {
  path: string
  title: string
  body: string
  focusSelector?: string
  focusLabel?: string
  avatarSrc?: string
  avatarAlt?: string
  audioSrc?: string
  audioLabel?: string
  audioPendingText?: string
}

interface TourContextValue {
  steps: TourStep[]
  step: number
  isOpen: boolean
  currentStep: TourStep | null
  start: (fromStep?: number) => void
  prev: () => void
  next: () => void
  skip: () => void
}

const DEFAULT_STEPS: TourStep[] = [
  {
    path: '/?tour=opening-brief',
    title: 'Opening Brief',
    body: 'Listen to the AU Commissioner briefing before proceeding to command surfaces.',
    focusLabel: 'Commissioner briefing',
    avatarSrc: '/assets/actors/AU%20Commissioner.png',
    avatarAlt: 'AU Commissioner',
    audioSrc: '/assets/audio/messages/AU%20Commissioner_envoy_welcome.mp3',
    audioLabel: 'Encrypted voice message to the Special Envoy',
  },
  {
    path: '/?tour=command',
    title: 'Command Rail',
    body: 'This is your executive rail for the operation. Use Mission Brief for doctrine, Status Report for campaign results, and Onboarding to rerun this guided walk-through.',
    focusSelector: '.game-header-nav',
    focusLabel: 'Header command controls',
  },
  {
    path: '/?tour=metrics',
    title: 'Campaign Vital Signs',
    body: 'Track resources, stability, insurgency, and humanitarian pressure here. This panel tells you whether your strategy is sustaining regional legitimacy.',
    focusSelector: '.sidebar-left',
    focusLabel: 'Metrics and resource panel',
  },
  {
    path: '/?tour=theater',
    title: 'Sahel Theater Map',
    body: 'Select territories and zones to inspect local conditions, identify flashpoints, and decide where AU action will have the highest strategic effect.',
    focusSelector: '.game-map-wrap',
    focusLabel: 'Operational map',
  },
  {
    path: '/?tour=intel',
    title: 'Intel Feed',
    body: 'The intelligence feed surfaces live field signals, urgent briefings, and confidence levels. Read it before committing actions so your response matches current risk and location-specific developments.',
    focusSelector: '#intel-feed',
    focusLabel: 'Intel feed',
  },
  {
    path: '/?tour=actors',
    title: 'Actor Feed',
    body: 'The actor feed shows who is engageable right now, how relationships are trending, and whether dialogue or action planning is available. Use it to decide which counterpart to influence this turn.',
    focusSelector: '#actor-panel',
    focusLabel: 'Actor feed',
  },
  {
    path: '/?tour=decision-surface',
    title: 'Decision Surface',
    body: 'This center panel summarizes your selected territory or zone and links directly to the relevant modal for deeper investigation or action planning.',
    focusSelector: '#scenario-panel',
    focusLabel: 'Tactical decision panel',
  },
  {
    path: '/?tour=operations',
    title: 'Action Cycle Control',
    body: 'Take Action consumes one of your turn actions. End Turn advances the simulation and applies consequences to stability, insurgency, and civilian outcomes.',
    focusSelector: '#action-bar',
    focusLabel: 'Action execution bar',
  },
]

const TourContext = createContext<TourContextValue | null>(null)

function clampStep(index: number, max: number): number {
  if (max <= 0) return 0
  if (index < 0) return 0
  if (index >= max) return max - 1
  return index
}

function routeFromLocation(pathname: string, search: string): string {
  return `${pathname}${search}`
}

export function TourProvider({ children }: PropsWithChildren): ReactNode {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const launcherRef = useRef<HTMLElement | null>(null)
  const focusRestoreFrameRef = useRef<number | null>(null)

  const steps = DEFAULT_STEPS

  const closeTour = useCallback((): void => {
    setIsOpen(false)
    if (typeof window === 'undefined') return
    if (focusRestoreFrameRef.current !== null) {
      window.cancelAnimationFrame(focusRestoreFrameRef.current)
    }
    focusRestoreFrameRef.current = window.requestAnimationFrame(() => {
      focusRestoreFrameRef.current = null
      const launcher = launcherRef.current
      if (launcher?.isConnected) {
        launcher.focus()
      }
    })
  }, [])

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && focusRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(focusRestoreFrameRef.current)
      }
    },
    []
  )

  const start = useCallback(
    (fromStep = 0) => {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        launcherRef.current = document.activeElement
      }
      const nextStep = clampStep(fromStep, steps.length)
      setStep(nextStep)
      setIsOpen(true)
      const nextPath = steps[nextStep]?.path
      const currentRoute = routeFromLocation(location.pathname, location.search)
      if (nextPath && nextPath !== currentRoute) {
        navigate(nextPath)
      }
    },
    [location.pathname, location.search, navigate, steps]
  )

  const next = useCallback(() => {
    if (!steps.length) return
    const followingStep = step + 1
    if (followingStep >= steps.length) {
      closeTour()
      return
    }
    const nextPath = steps[followingStep]?.path
    const currentRoute = routeFromLocation(location.pathname, location.search)
    if (nextPath && nextPath !== currentRoute) {
      navigate(nextPath)
    }
    setStep(followingStep)
  }, [closeTour, location.pathname, location.search, navigate, step, steps])

  const prev = useCallback(() => {
    if (!steps.length) return
    const previousStep = Math.max(0, step - 1)
    const previousPath = steps[previousStep]?.path
    const currentRoute = routeFromLocation(location.pathname, location.search)
    if (previousPath && previousPath !== currentRoute) {
      navigate(previousPath)
    }
    setStep(previousStep)
  }, [location.pathname, location.search, navigate, step, steps])

  const skip = useCallback(() => {
    closeTour()
  }, [closeTour])

  const currentStep = steps[step] ?? null

  const value = useMemo<TourContextValue>(
    () => ({
      steps,
      step,
      isOpen,
      currentStep,
      start,
      prev,
      next,
      skip,
    }),
    [currentStep, isOpen, next, prev, skip, start, step, steps]
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour(): TourContextValue {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within TourProvider')
  }
  return context
}
