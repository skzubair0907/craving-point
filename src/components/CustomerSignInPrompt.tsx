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
  return <div className="customer-signin-dialog fixed inset-0 z-[90] grid bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="customer-sign-in-title">
    <section className="customer-signin-card w-full max-w-md rounded-2xl border border-white/15 bg-[var(--brand-surface)] text-[var(--brand-cream)] shadow-2xl">
      <img src="/images/logo-new.png" alt="Craving Point" className="customer-signin-logo" />
      <p className="customer-signin-kicker">WELCOME TO CRAVING POINT .88</p>
      <h2 id="customer-sign-in-title" className="customer-signin-title">Save your cravings</h2>
      <p className="customer-signin-description">Continue with Google to keep your name and email ready for future orders.</p>
      <button type="button" className="customer-signin-google btn-primary" disabled={busy} onClick={continueWithGoogle}>{busy ? 'Opening Google…' : 'Continue with Google'}</button>
      <button type="button" className="customer-signin-guest" onClick={continueAsGuest}>Continue as guest</button>
      {message && <p role="status" className="mt-4 text-sm text-[var(--cp-primary)]">{message}</p>}
    </section>
  </div>
}
