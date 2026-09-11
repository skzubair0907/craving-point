const fs=require('fs');
fs.writeFileSync('src/pages/AdminSettings.tsx', `import { useState } from 'react'
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
`);
fs.writeFileSync('src/pages/Home.tsx', `import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, MapPin, MessageCircle, Leaf, Star } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'
import { useRestaurantStatus } from '../hooks/useRestaurantStatus'

export default function Home() {
  const { menuItems, categories, restaurantSettings: settings, reviews } = useRestaurantData()
  const status = useRestaurantStatus()
  const activeCategories = categories.filter(c => c.is_active && c.id !== 'all').sort((a,b) => a.display_order - b.display_order)
  const visible = menuItems.filter(item => item.is_available && categories.some(c => c.id === item.category_id && c.is_active))
  const popular = [...visible].sort((a,b) => Number(Boolean(b.is_featured || b.is_bestseller)) - Number(Boolean(a.is_featured || a.is_bestseller))).slice(0,4)
  const whatsapp = 'https://wa.me/' + (settings.whatsapp_number || settings.phone).replace(/\\D/g, '') + '?text=' + encodeURIComponent('Hi! I would like to place an order.')
  return <div>
    <section className="section-shell grid items-center gap-10 py-10 md:py-16 lg:grid-cols-2">
      <div><p className="eyebrow">Cheeta Camp · Mumbai</p><h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.02]">Your next<br/><span className="text-primary">craving, sorted.</span></h1><p className="mt-6 max-w-lg text-lg text-accent/60">Sweet treats, savoury bites, and your favourites from Craving Point. Choose your size, make it yours, and order in a few taps.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3"><Link to="/menu" className="btn-primary gap-2">View menu <ArrowRight size={18}/></Link><a className="btn-secondary gap-2" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18}/>Order on WhatsApp</a></div>
        <div className="mt-7 flex flex-wrap items-center gap-4 text-sm"><span className={status.isOpen ? 'text-green-500 font-bold' : 'text-accent/60'}>{status.isOpen ? 'Open now' : 'Currently closed'}</span><span className="text-accent/60">{settings.pickup_available !== false ? 'Pickup available' : ''}{settings.delivery_available !== false ? ' · Local delivery' : ''}</span></div>
      </div>
      <div className="relative"><img src="/images/17.jpeg" alt="Food from Craving Point" className="aspect-[5/4] w-full rounded-[2rem] object-cover" fetchPriority="high" width="800" height="640"/><div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/75 p-4 text-keep-white backdrop-blur"><p className="font-bold">Made for your kind of craving.</p><p className="mt-1 text-sm">Explore waffles, chocolate bowls, burgers, and more.</p></div></div>
    </section>
    <section className="section-shell py-10"><div className="flex flex-wrap justify-between items-end gap-4 mb-7"><div><p className="eyebrow">Start here</p><h2 className="section-title">House favourites</h2></div><Link className="text-primary font-bold" to="/menu">See the full menu →</Link></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">{popular.map(item => <Link key={item.id} to={'/menu/' + item.slug} className="card-premium overflow-hidden group"><img src={item.image_url} alt={item.name} loading="lazy" width="400" height="300" className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]"/><div className="p-4"><p className="text-xs mb-2 text-accent/60">{item.is_veg ? 'Vegetarian' : 'Non-vegetarian'}</p><h3 className="font-bold leading-snug">{item.name}</h3><p className="mt-3 text-primary font-black">{item.price_variants?.length ? 'From ' : ''}₹{item.price}</p></div></Link>)}</div>{!popular.length && <p>Our menu is being updated. Please contact us for today’s availability.</p>}</section>
    <section className="section-shell py-10"><h2 className="text-2xl font-black mb-5">What are you craving?</h2><div className="flex flex-wrap gap-3">{activeCategories.map(category => <Link key={category.id} to={'/menu#cat-' + category.id} className="btn-secondary">{category.name}</Link>)}</div></section>
    <section id="about" className="section-shell py-12"><div className="glass-card p-6 sm:p-10 grid gap-8 md:grid-cols-2"><div><p className="eyebrow">Your neighbourhood stop</p><h2 className="section-title">A little sweet.<br/>A little savoury.</h2></div><div className="space-y-4 text-accent/60"><p>{settings.tagline} Explore the menu, choose your portion, and add the extras you enjoy.</p><p>Order for {settings.pickup_available !== false ? 'pickup' : 'delivery'} or speak with our team on WhatsApp for help choosing your meal.</p><p>For ingredients, allergies, and special preparation requests, contact us before ordering.</p></div></div></section>
    {!!reviews.length && <section className="section-shell py-10"><p className="eyebrow">From our customers</p><h2 className="section-title mb-7">Recent reviews</h2><div className="grid md:grid-cols-3 gap-5">{reviews.slice(0,3).map(review => <blockquote className="card-premium p-6" key={review.id}><div className="flex text-primary gap-1" aria-label={review.rating + ' out of 5 stars'}>{Array.from({length:review.rating},(_,i)=><Star key={i} size={16} fill="currentColor"/>)}</div><p className="my-4">“{review.review}”</p><footer className="text-sm text-accent/60">{review.name} · Verified order</footer></blockquote>)}</div></section>}
    <section id="reels" className="section-shell py-8"><a className="btn-secondary" href={settings.instagram_url} target="_blank" rel="noreferrer">Follow our latest dishes on Instagram <ArrowRight className="ml-2" size={16}/></a></section>
    <section id="location" className="section-shell py-12"><div className="grid gap-8 md:grid-cols-2"><div><p className="eyebrow">Come say hello</p><h2 className="section-title">Visit Craving Point</h2><p className="mt-5 text-accent/60 flex gap-3"><MapPin size={20} className="shrink-0"/>{settings.address}</p><a href={settings.google_maps_url} target="_blank" rel="noreferrer" className="btn-primary mt-6">Get directions</a></div><div className="card-premium p-6"><h3 className="font-bold flex gap-2 mb-4"><Clock3 size={20}/>Opening hours</h3><dl className="space-y-2 text-sm">{settings.opening_hours.map(day=><div className="flex justify-between gap-4" key={day.day}><dt>{day.day}</dt><dd>{day.open} – {day.close}{day.close <= day.open ? ' (+1 day)' : ''}</dd></div>)}</dl><a className="mt-5 block text-primary" href={'tel:' + settings.phone}>{settings.phone}</a></div></div></section>
  </div>
}
`);
