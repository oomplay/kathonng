import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Must come before the scene imports: it installs a narrow Three.js warning
// filter that has to be active before React Three Fiber is evaluated.
import './lib/threeConsole'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
