import OrderHistory from '../components/OrderHistory'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRestaurantData } from '../store/useRestaurantData'
import { useFavoritesStore } from '../store/useFavoritesStore'
const key = 'craving-point-profile'
export default function Account() {
  const { menuItems } = useRestaurantData()
  const { ids, toggle } = useFavoritesStore()
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<Record<string, string>>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); return saved && typeof saved === 'object' ? saved : {} } catch { return {} }
  })
  return <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
    <div><h1 className="section-title">Your details</h1><p className="mt-3 text-accent/60">Save your details on this device for your next order.</p></div>
    <form className="card-premium p-6 space-y-5" onSubmit={(event) => { event.preventDefault(); try { localStorage.setItem(key, JSON.stringify(profile)); setMessage('Details saved on this device.') } catch { setMessage('Your browser could not save these details.') } }}>
      {Object.entries({ name: 'Full name', email: 'Email', phone: 'Phone number', address: 'Delivery address' }).map(([field, label]) => <div key={field}><label className="block mb-2" htmlFor={field}>{label}</label><input id={field} value={profile[field] || ''} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} className="w-full border border-[var(--brand-border)] rounded-xl px-4 py-3" /></div>)}
      <button className="btn-primary" type="submit">Save details</button><p role="status">{message}</p>
    </form>
    <OrderHistory/><section className="card-premium p-6"><h2 className="text-2xl font-bold mb-4">Recent order</h2><Link to="/order-confirmation" className="text-primary underline">View your latest order</Link></section>
    <section className="card-premium p-6"><h2 className="text-2xl font-bold mb-4">Favorites</h2>{ids.length === 0 && <p>No favorites saved yet. <Link className="text-primary underline" to="/menu">Browse menu</Link></p>}{menuItems.filter(item => ids.includes(item.id)).map(item => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><Link to={'/menu/' + item.slug}>{item.name}</Link><button onClick={() => toggle(item.id)} className="text-primary" aria-label={'Remove ' + item.name + ' from favorites'}>Remove</button></div>)}</section>
  </div>
}
