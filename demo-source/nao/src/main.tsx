import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installDemoBackend } from './demo/mockServer'

if (import.meta.env.VITE_DEMO_BACKEND === 'true') installDemoBackend()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
