import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, CheckCircle2, ClipboardList, Clock3, LogOut, MapPin, Navigation, Phone, RefreshCw, Route } from 'lucide-react'
import { DeliveryMap } from '../components/DeliveryMap2'
import { useDeliveryTracking } from '../hooks/useDeliveryTracking'
import { calculateDistance } from '../lib/mapUtils'
import { supabase } from '../lib/supabase'

type Job = { id: string; order_number: string; payload: any }
type Sample = { ts: number; lat: number; lng: number }
const cash = (value: any) => `₹${Number(value || 0).toFixed(2)}`
const riderAction = (status: string): ['accept' | 'pickup' | 'start', string] => {
  if (status === 'rider_assigned') return ['accept', 'Accept job']
  if (status === 'rider_accepted') return ['pickup', 'Confirm pickup']
  if (status === 'picked_up') return ['accept', 'Accept delivery']
  return ['start', 'Start delivery']
}
const riderStatusLabel = (status: string) => ({ rider_assigned: 'JOB ASSIGNED', rider_accepted: 'GO TO PICKUP', picked_up: 'PICKED UP', out_for_delivery: 'ON THE WAY', arrived: 'AT CUSTOMER' }[status] || 'READY FOR COLLECTION')

export default function DeliveryPartner() {
  const [user, setUser] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [earnings, setEarnings] = useState<any>(null)
  const [sharing, setSharing] = useState<Record<string, boolean>>({})
  const [lastLocationAt, setLastLocationAt] = useState<Record<string, number>>({})
  const watches = useRef(new Map<string, number>())
  const pulses = useRef(new Map<string, number>())
  const lastPublish = useRef(new Map<string, Sample>())
  const message = (text: string) => setNotice(text.includes('delivery_partner_') ? 'Delivery portal setup is pending. Ask the owner to run the Delivery Partner SQL setup once in Supabase.' : text)

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    if (!session?.user) return
    const activation = await supabase.rpc('activate_my_delivery_partner_account')
    if (activation.error) { message(activation.error.message); return }
    if (!activation.data) {
      setJobs([])
      setNotice(`The website is signed in as ${session.user.email || 'an unknown email'}, but that email is not linked to an active delivery boy. In Admin → Delivery, save this exact email for the rider.`)
      return
    }
    const [orders, summary] = await Promise.all([supabase.rpc('delivery_partner_orders'), supabase.rpc('delivery_partner_earnings')])
    if (orders.error) message(orders.error.message)
    else { setJobs(orders.data || []); setNotice('') }
    if (!summary.error) setEarnings(summary.data?.[0] || null)
  }, [])

  function stopSharing(jobId: string) {
    const watch = watches.current.get(jobId)
    if (watch != null && navigator.geolocation) navigator.geolocation.clearWatch(watch)
    watches.current.delete(jobId)
    const pulse = pulses.current.get(jobId)
    if (pulse != null) window.clearInterval(pulse)
    pulses.current.delete(jobId)
    setSharing(current => ({ ...current, [jobId]: false }))
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 10_000)
    return () => {
      window.clearInterval(timer)
      watches.current.forEach(id => navigator.geolocation?.clearWatch(id))
      pulses.current.forEach(id => window.clearInterval(id))
    }
  }, [refresh])

  const publish = async (job: Job, position: GeolocationPosition) => {
    const result = await supabase.rpc('set_delivery_location', {
      p_order_number: job.order_number,
      p_latitude: Number(position.coords.latitude),
      p_longitude: Number(position.coords.longitude),
      p_accuracy: Number(position.coords.accuracy),
    })
    if (result.error) {
      const detail = result.error.message || 'Unable to publish location.'
      if (/access denied|not assigned/i.test(detail)) message('This delivery is not assigned to your rider account. Ask the manager to check the rider assignment.')
      else if (/delivery_tracking_audit|delivery_tracking/i.test(detail)) message('Live location database setup is pending. Run delivery-partner-portal.sql once in Supabase.')
      else message(detail)
    }
    return result
  }

  function share(job: Job) {
    if (!navigator.geolocation) { message('Location is not supported on this phone.'); return }
    if (watches.current.has(job.id)) return
    setBusy(job.id)
    const options = { enableHighAccuracy: true, maximumAge: 2_000, timeout: 20_000 }
    const sendPosition = (position: GeolocationPosition) => {
      const now = Date.now()
      const previous = lastPublish.current.get(job.id)
      const distance = previous ? calculateDistance(previous.lat, previous.lng, position.coords.latitude, position.coords.longitude) : Infinity
      if (previous && now - previous.ts < 2_500 && distance < 10) return
      void publish(job, position).then(result => {
        if (result.error) {
          if (/access denied|not assigned/i.test(result.error.message || '')) stopSharing(job.id)
          return
        }
        lastPublish.current.set(job.id, { ts: now, lat: position.coords.latitude, lng: position.coords.longitude })
        setLastLocationAt(current => ({ ...current, [job.id]: now }))
        setSharing(current => ({ ...current, [job.id]: true }))
        setNotice('Live location is sharing with the customer. Keep this page open while you travel.')
      }).catch(error => message(error?.message || 'Unable to publish live location.')).finally(() => setBusy(''))
    }
    const locationError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        stopSharing(job.id)
        message('Location permission is off. Allow location in browser settings, then tap Restart GPS.')
      } else message(`GPS is waiting for a signal: ${error.message}. Keep this page open, then tap Restart GPS if it does not recover.`)
      setBusy('')
    }
    navigator.geolocation.getCurrentPosition(sendPosition, locationError, options)
    watches.current.set(job.id, navigator.geolocation.watchPosition(sendPosition, locationError, options))
    // Android may pause a watch callback. A foreground pulse refreshes the server timestamp.
    pulses.current.set(job.id, window.setInterval(() => {
      if (document.visibilityState === 'visible') navigator.geolocation.getCurrentPosition(sendPosition, locationError, options)
    }, 20_000))
  }

  async function advance(job: Job, action: 'accept' | 'pickup' | 'start' | 'arrive') {
    setBusy(job.id)
    const result = await supabase.rpc('delivery_partner_advance_order', { p_order_id: job.id, p_action: action })
    if (result.error) message(result.error.message)
    else {
      if (action === 'start' || (action === 'accept' && job.payload.status === 'picked_up')) { setNotice('Delivery started. Allow location access to share the trip with the customer.'); share(job) }
      else setNotice(action === 'accept' ? 'Job accepted. Head to Craving Point for pickup.' : action === 'pickup' ? 'Pickup confirmed. You can now start the delivery.' : 'Arrival recorded. You can now mark the delivery completed.')
      await refresh()
    }
    setBusy('')
  }

  async function complete(job: Job) {
    setBusy(job.id)
    const result = await supabase.rpc('delivery_partner_confirm_delivery', { p_order_id: job.id })
    if (result.error) message(result.error.message)
    else { stopSharing(job.id); setNotice('Delivery completed. Great work.'); await refresh() }
    setBusy('')
  }

  const signIn = async () => {
    const result = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/delivery-partner` } })
    if (result.error) message(result.error.message)
  }

  if (!user) return <main className="min-h-screen bg-[#100d0c] p-5 text-white"><div className="mx-auto max-w-md pt-8"><div className="mb-10 flex items-center gap-3"><img src="/images/logo-new.png" className="h-14 w-14 rounded-2xl bg-white object-contain"/><div><p className="text-xs font-bold tracking-widest text-orange-300">CRAVING POINT</p><b>Delivery partner</b></div></div><section className="rounded-3xl border border-orange-400/20 bg-gradient-to-br from-orange-500/20 via-[#211816] to-[#141111] p-7 shadow-2xl"><Bike size={34} className="text-primary"/><p className="mt-8 text-xs font-bold tracking-[.2em] text-orange-200">RIDER WORKSPACE</p><h1 className="mt-2 text-4xl font-black">Deliver with confidence.</h1><p className="mt-5 leading-7 text-white/70">Sign in with the Google account linked by your restaurant manager. You will see only your assigned deliveries.</p><button className="btn-primary mt-7 w-full justify-center" onClick={() => void signIn()}>Continue with Google</button></section>{notice && <p className="mt-5 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4 text-sm">{notice}</p>}</div></main>

  return <main className="min-h-screen bg-[#100d0c] p-4 text-white sm:p-7"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between border-b border-white/10 pb-5"><Link to="/" className="flex items-center gap-3"><img src="/images/logo-new.png" className="h-12 w-12 rounded-xl bg-white object-contain"/><div><p className="text-[10px] font-bold tracking-widest text-orange-300">CRAVING POINT</p><b>Rider workspace</b></div></Link><button className="btn-secondary flex gap-2 px-4 py-2 text-xs" onClick={() => void supabase.auth.signOut()}><LogOut size={15}/>Sign out</button></header><section className="mt-6 rounded-3xl border border-orange-400/20 bg-gradient-to-r from-[#281611] via-[#1c1715] to-[#141212] p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold tracking-[.2em] text-orange-200">ON SHIFT</p><h1 className="mt-2 text-4xl font-black">Your delivery desk</h1><p className="mt-3 text-sm text-white/65">Assigned jobs, live location, customer contact and safe delivery confirmation.</p></div><button className="btn-secondary flex gap-2" onClick={() => void refresh()}><RefreshCw size={16}/>Refresh jobs</button></div></section><div className="mt-5 grid gap-3 sm:grid-cols-3">{[[<ClipboardList size={17}/>,'Assigned',jobs.length],[<CheckCircle2 size={17}/>,'Completed',earnings?.completed_deliveries || 0],[<Bike size={17}/>,'Earnings',cash(earnings?.delivery_earnings)]].map(([icon, label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#1a1614] p-4"><div className="flex justify-between text-orange-200">{icon}<span className="text-xs font-bold uppercase">{label}</span></div><b className="mt-3 block text-2xl">{value as any}</b></div>)}</div>{notice && <p className="mt-5 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4 text-sm">{notice}</p>}<section className="mt-8"><p className="text-xs font-bold tracking-[.2em] text-orange-300">ASSIGNED TO YOU</p><h2 className="mt-2 text-2xl font-black">Active deliveries</h2>{!jobs.length ? <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-[#171412] p-12 text-center"><Clock3 className="mx-auto text-orange-300"/><h3 className="mt-4 text-xl font-bold">No active deliveries</h3><p className="mt-2 text-sm text-white/60">New jobs appear here after your manager assigns them and marks the order ready.</p></div> : <div className="mt-5 grid gap-5">{jobs.map(job => { const order = job.payload; const active = ['out_for_delivery', 'arrived'].includes(order.status); const fresh = Boolean(lastLocationAt[job.id] && Date.now() - lastLocationAt[job.id] < 45_000); return <article key={job.id} className="rounded-3xl border border-white/10 bg-[#1a1614]"><div className="flex flex-wrap justify-between gap-4 border-b border-white/10 p-5"><div><p className="text-xs text-white/45">{job.order_number}</p><h3 className="mt-2 text-2xl font-black">{order.customer?.name || 'Customer'}</h3><p className="mt-2 text-sm font-bold text-orange-200">{active ? '● ON THE WAY' : 'READY FOR COLLECTION'}</p></div><b className="text-xl">{cash(order.total)}</b></div><div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]"><div><p className="text-sm text-white/70">{order.items.map((item: any) => `${item.quantity} × ${item.name}`).join(' · ')}</p><div className="mt-4 flex flex-wrap gap-3"><a className="btn-secondary flex gap-2" href={`tel:${order.customer?.phone || ''}`}><Phone size={16}/>Call customer</a><a className="btn-secondary flex gap-2" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customer?.address || '')}`}><MapPin size={16}/>Navigate</a></div>{active && <p className={`mt-4 text-sm ${fresh ? 'text-emerald-300' : 'text-amber-200'}`}>{fresh ? '● Customer can see your live location.' : sharing[job.id] ? '● GPS update is delayed. Keep this page open or restart GPS.' : 'Location is not sharing yet.'}</p>}</div><div className="flex flex-col gap-3 lg:w-64">{!active ? <button className="btn-primary justify-center" disabled={busy === job.id} onClick={() => { const [action] = riderAction(order.status); void advance(job, action) }}><Route size={17}/>{riderAction(order.status)[1]}</button> : <><button className="btn-primary justify-center" disabled={busy === job.id} onClick={() => { stopSharing(job.id); share(job) }}><Navigation size={17}/>{sharing[job.id] ? 'Restart GPS' : 'Start live location'}</button><p className="text-center text-xs text-white/45">Allow location and keep this page open during the trip.</p><button className="btn-secondary justify-center" disabled={busy === job.id} onClick={() => void complete(job)}>Delivered</button></>}</div></div>{active && <SelectedJobMap orderNumber={job.order_number} customer={order.customer} customerLocation={order.customerLocation ?? order.customer}/>}</article> })}</div>}</section></div></main>
}

function SelectedJobMap({ orderNumber, customer, customerLocation }: { orderNumber: string; customer?: any; customerLocation?: { lat?: number; lng?: number } | null }) {
  const { data: riderLocation } = useDeliveryTracking(orderNumber)
  const customerPoint = customerLocation && typeof customerLocation.lat === 'number' && typeof customerLocation.lng === 'number' ? { lat: Number(customerLocation.lat), lng: Number(customerLocation.lng) } : customer && typeof customer.lat === 'number' && typeof customer.lng === 'number' ? { lat: Number(customer.lat), lng: Number(customer.lng) } : null
  if (!customerPoint) return <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/15 p-4 text-sm text-white/65">Customer map is unavailable because this order has no saved GPS location. Use the delivery address and Navigate button.</div>
  return <div className="mt-5 overflow-hidden rounded-3xl border border-orange-400/20 bg-[#181411] shadow-[0_16px_40px_rgba(0,0,0,0.28)]" style={{ height: 320 }}><DeliveryMap customerLocation={customerPoint} riderLocation={riderLocation ? { lat: riderLocation.latitude, lng: riderLocation.longitude, accuracy: riderLocation.accuracy, timestamp: riderLocation.timestamp } : null} height={320}/></div>
}
