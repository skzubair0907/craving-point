import OrderHistory from '../components/OrderHistory'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRestaurantData } from '../store/useRestaurantData'
import { useFavoritesStore } from '../store/useFavoritesStore'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
const key = 'craving-point-profile'
export default function Account() {
const navigate = useNavigate()
  const { menuItems } = useRestaurantData()
  const { ids, toggle } = useFavoritesStore()
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<Record<string, string>>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); return saved && typeof saved === 'object' ? saved : {} } catch { return {} }
  })
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string; name?: string } } | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const applyUser = (nextUser: typeof user) => {
      setUser(nextUser)
      if (nextUser) setProfile(current => ({ ...current, name: current.name || nextUser.user_metadata?.full_name || nextUser.user_metadata?.name || '', email: current.email || nextUser.email || '' }))
    }
    void supabase.auth.getUser().then(({ data }: { data: { user: typeof user } }) => applyUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { user: typeof user } | null) => applyUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])
  const signInWithGoogle = async () => {
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/account' } })
    if (error) { setMessage(error.message); setSigningIn(false) }
  }
  const signOut = async () => { await supabase.auth.signOut(); setMessage('You are signed out.') }
  return <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
    <div><h1 className="section-title">Your details</h1><p className="mt-3 text-accent/60">Save your details on this device for your next order.</p></div>
    {isSupabaseConfigured && <section className="card-premium p-6"><h2 className="text-2xl font-bold">{user ? 'Signed in' : 'Save details with Google'}</h2><p className="mt-2 text-accent/70">{user ? `Signed in as ${user.email || 'your Google account'}.` : 'Sign in to keep your name and email connected to your customer account.'}</p>{user ? <button type="button" className="mt-4 text-primary underline" onClick={signOut}>Sign out</button> : <button type="button" className="btn-primary mt-4" disabled={signingIn} onClick={signInWithGoogle}>{signingIn ? 'Opening Google…' : 'Continue with Google'}</button>}</section>}
    <form className="card-premium p-6 space-y-5" onSubmit={(event) => { event.preventDefault(); try { localStorage.setItem(key, JSON.stringify(profile)); navigate('/', { replace: true }) } catch { setMessage('Your browser could not save these details.') } }}>
      {Object.entries({ name: 'Full name', email: 'Email', phone: 'Phone number', address: 'Delivery address' }).map(([field, label]) => <div key={field}><label className="block mb-2" htmlFor={field}>{label}</label><input id={field} value={profile[field] || ''} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} className="w-full border border-[var(--brand-border)] rounded-xl px-4 py-3" /></div>)}
      <button className="btn-primary" type="submit">Save details</button><p role="status">{message}</p>
    </form>
    <OrderHistory/>
    <section className="card-premium p-6"><h2 className="text-2xl font-bold mb-4">Favorites</h2>{ids.length === 0 && <p>No favorites saved yet. <Link className="text-primary underline" to="/menu">Browse menu</Link></p>}{menuItems.filter(item => ids.includes(item.id)).map(item => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><Link to={'/menu/' + item.slug}>{item.name}</Link><button onClick={() => toggle(item.id)} className="text-primary" aria-label={'Remove ' + item.name + ' from favorites'}>Remove</button></div>)}</section>
  </div>
}
