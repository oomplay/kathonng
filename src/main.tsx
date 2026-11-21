import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// The Three.js warning filter is installed by the lazy scene chunk (see
// src/scene/Scene.tsx) so that importing `three` here would pull the whole
// library into the initial bundle.
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppFallback } from './ui/AppFallback'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<AppFallback />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
