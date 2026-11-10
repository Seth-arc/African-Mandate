import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import { TourProvider } from './tour/TourContext'
import './styles/tokens.css'
import './styles/globals.css'
import './styles/layout.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element')

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TourProvider>
        <App />
      </TourProvider>
    </BrowserRouter>
  </StrictMode>
)
