import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const dismissedKey = 'craving-point-welcome-dismissed'

export default function CustomerSignInPrompt() {
  const [open, setOpen] = useState(false)
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const shouldOpen = () => !sessionStorage.getItem(dismissedKey)
    if (!isSupabaseConfigured) {
      sessionStorage.setItem(dismissedKey, 'true')
      setOpen(false)
      setCheckingSession(false)
      return
    }

    let active = true
    const applySession = (hasSession: boolean) => {
      if (!active) return
      setOpen(!hasSession && shouldOpen())
      setCheckingSession(false)
    }
    void supabase.auth.getSession().then(({ data }: { data: { session: unknown | null } }) => applySession(Boolean(data.session))).catch(() => applySession(false))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: unknown | null) => applySession(Boolean(session)))
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const continueAsGuest = () => { sessionStorage.setItem(dismissedKey, 'true'); setOpen(false) }
  const continueWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      sessionStorage.setItem(dismissedKey, 'true')
      setOpen(false)
      setMessage('')
      return
    }
    setBusy(true)
    sessionStorage.setItem(dismissedKey, 'true')
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/account' } })
      if (error) throw error
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google sign-in could not be started.')
      setBusy(false)
    }
  }
  if (checkingSession || !open) return null
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="customer-sign-in-title">
    <section className="w-full max-w-md rounded-2xl border border-white/15 bg-[var(--brand-surface)] p-7 text-[var(--brand-cream)] shadow-2xl">
      <img src="/images/logo-new.png" alt="Craving Point" className="h-16 w-16 rounded-lg" />
      <p className="mt-5 text-xs font-semibold tracking-[.16em] text-[var(--cp-primary)]">WELCOME TO CRAVING POINT .88</p>
      <h2 id="customer-sign-in-title" className="mt-3 font-[var(--font-display)] text-4xl uppercase leading-none">Save your cravings</h2>
      <p className="mt-4 text-sm leading-6 text-[var(--brand-cream-soft)]">Continue with Google to keep your name and email ready for future orders.</p>
      <button type="button" className="btn-primary mt-6 w-full" disabled={busy} onClick={continueWithGoogle}>{busy ? 'Opening Google…' : 'Continue with Google'}</button>
      <button type="button" className="mt-4 w-full text-sm text-[var(--brand-cream-soft)] underline" onClick={continueAsGuest}>Continue as guest</button>
      {message && <p role="status" className="mt-4 text-sm text-[var(--cp-primary)]">{message}</p>}
    </section>
  </div>
}
