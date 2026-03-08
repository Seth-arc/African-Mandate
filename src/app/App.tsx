import { useEffect, type ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { GameLayout } from '../ui/layout/GameLayout'
import { useSessionStore } from '../state/sessionStore'

function App(): ReactNode {
  const initialize = useSessionStore((s) => s.initialize)
  const dispose = useSessionStore((s) => s.dispose)

  useEffect(() => {
    void initialize()
    return () => {
      dispose()
    }
  }, [dispose, initialize])

  return (
    <ErrorBoundary>
      <GameLayout />
    </ErrorBoundary>
  )
}

export default App
