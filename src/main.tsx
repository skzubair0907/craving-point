import React from 'react'
import { MotionConfig } from 'framer-motion'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './styles/fonts.css'
import './index.css'
import './styles/editorial.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
  })
}

// Basic global error handlers to capture runtime errors in the browser console
window.addEventListener('error', (ev) => {
  // eslint-disable-next-line no-console
  console.error('Global error captured:', ev.error || ev.message, ev)
})
window.addEventListener('unhandledrejection', (ev) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection:', ev.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user"><App /></MotionConfig>
    </ErrorBoundary>
  </React.StrictMode>
)
