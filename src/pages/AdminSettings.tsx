import { useState } from 'react'
import { useRestaurantStore } from '../store/useRestaurantData'
export default function AdminSettings() {
  const { catalog, revision, publish, error: loadError } = useRestaurantStore()
  const [draft, setDraft] = useState({ ...catalog.restaurantSettings })
  const [baseRevision, setBaseRevision] = useState(revision)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const textFields = { name: 'Restaurant name', tagline: 'Tagline', phone: 'Phone number', whatsapp_number: 'WhatsApp number (country code + number)', email: 'Email', address: 'Address', google_maps_url: 'Directions URL', instagram_url: 'Instagram URL' }
  const numberFields = { delivery_fee: 'Delivery fee (₹)', free_delivery_above: 'Free delivery above (₹)', tax_percentage: 'Tax (%)', min_order_value: 'Minimum order (₹)', preparation_minutes: 'Estimated preparation (minutes)' }
  return <div className="p-4 sm:p-8 space-y-6"><h1 className="section-title">Restaurant settings</h1><p>Publish contact details, opening hours, and ordering rules to the website.</p>{loadError && <p role="alert">{loadError}</p>}
    <button className="btn-secondary" onClick={() => { setDraft({ ...catalog.restaurantSettings }); setBaseRevision(revision); setMessage('Latest settings loaded.') }}>Load latest settings</button>
    <form className="card-premium p-5 space-y-6" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(''); try {
      if (baseRevision !== useRestaurantStore.getState().revision) throw new Error('The store changed. Load the latest settings before publishing.')
      if ((draft.tax_percentage || 0) > 100) throw new Error('Tax must be between 0 and 100%.')
      if (!draft.delivery_available && !draft.pickup_available && draft.online_ordering_enabled) throw new Error('Enable delivery or pickup before turning ordering on.')
      const opening_hours_label = draft.opening_hours.map(day => day.day.slice(0, 3) + ' ' + day.open + '–' + day.close).join(' · ')
      await publish('restaurantSettings', { ...draft, opening_hours_label }); setBaseRevision(useRestaurantStore.getState().revision); setMessage('Settings published to the storefront and checkout.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish settings.') } finally { setBusy(false) } }}>
      <div className="grid sm:grid-cols-2 gap-5">{Object.entries(textFields).map(([key, label]) => <label className="grid gap-2" key={key}>{label}<input className="admin-input" required={['name', 'phone', 'address'].includes(key)} type={key === 'email' ? 'email' : 'text'} value={String((draft as any)[key] || '')} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
      {Object.entries(numberFields).map(([key, label]) => <label className="grid gap-2" key={key}>{label}<input className="admin-input" type="number" min="0" max={key === 'tax_percentage' ? 100 : undefined} step=".01" required value={Number((draft as any)[key] || 0)} onChange={e => setDraft({ ...draft, [key]: Number(e.target.value) })} /></label>)}</div>
      <div className="flex flex-wrap gap-6">{Object.entries({ online_ordering_enabled: 'Accept online orders', delivery_available: 'Delivery available', pickup_available: 'Pickup available' }).map(([key,label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={Boolean((draft as any)[key])} onChange={e => setDraft({ ...draft, [key]: e.target.checked })} />{label}</label>)}</div>
      <fieldset className="space-y-3"><legend className="font-bold mb-3">Opening hours (India time; a closing time before opening continues into the next day)</legend>{draft.opening_hours.map((day,index) => <div key={day.day} className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-center"><span>{day.day}</span>{(['open','close'] as const).map(key => <input key={key} required aria-label={day.day + ' ' + key} className="admin-input" type="time" value={day[key]} onChange={e => setDraft({ ...draft, opening_hours: draft.opening_hours.map((d,i) => i === index ? { ...d, [key]: e.target.value } : d) })}/>)}</div>)}</fieldset>
      <button disabled={busy} className="btn-primary">{busy ? 'Publishing…' : 'Publish settings'}</button><p role="status">{message}</p>
    </form></div>
}
