import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'craving-theme'

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  let stored: string | null = null
  try { stored = window.localStorage.getItem(STORAGE_KEY) } catch { return 'dark' }
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

const applyTheme = (theme: Theme) => {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('theme-light', theme === 'light')
}

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try { window.localStorage.setItem(STORAGE_KEY, theme) } catch { /* Keep theme in memory. */ }
  }, [theme])

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  const toggleTheme = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')

  return { theme, toggleTheme }
}

export default useTheme