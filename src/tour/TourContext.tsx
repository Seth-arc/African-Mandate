import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react'
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
    avatarSrc: '/assets/actors/AU Commissioner.png',
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
    title: 'Intel And Actor Feed',
    body: 'The right rail captures live incident signals and actor behavior. Read this feed before committing actions so your interventions match current risk.',
    focusSelector: '.sidebar-right',
    focusLabel: 'Intel and actor feed',
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

  const steps = DEFAULT_STEPS

  const start = useCallback(
    (fromStep = 0) => {
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
    setStep((currentStep) => {
      const followingStep = currentStep + 1
      if (followingStep >= steps.length) {
        setIsOpen(false)
        return currentStep
      }
      const nextPath = steps[followingStep]?.path
      const currentRoute = routeFromLocation(location.pathname, location.search)
      if (nextPath && nextPath !== currentRoute) {
        navigate(nextPath)
      }
      return followingStep
    })
  }, [location.pathname, location.search, navigate, steps])

  const prev = useCallback(() => {
    if (!steps.length) return
    setStep((currentStep) => {
      const previousStep = currentStep - 1
      if (previousStep < 0) {
        return 0
      }
      const previousPath = steps[previousStep]?.path
      const currentRoute = routeFromLocation(location.pathname, location.search)
      if (previousPath && previousPath !== currentRoute) {
        navigate(previousPath)
      }
      return previousStep
    })
  }, [location.pathname, location.search, navigate, steps])

  const skip = useCallback(() => {
    setIsOpen(false)
  }, [])

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
