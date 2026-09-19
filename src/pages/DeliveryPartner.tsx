import { useCallback, useEffect, useRef, useState } from 'react'
import { calculateDistance } from '../lib/mapUtils'
import { DeliveryMap } from '../components/DeliveryMap2'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Bike, CheckCircle2, ClipboardList, Clock3, LogOut, MapPin, Navigation, Phone, RefreshCw, Route } from 'lucide-react'
type Job={id:string;order_number:string;payload:any}
const cash=(v:any)=>`₹${Number(v||0).toFixed(2)}`
export default function DeliveryPartner(){
 const [user,setUser]=useState<any>(null),[jobs,setJobs]=useState<Job[]>([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[otp,setOtp]=useState<Record<string,string>>({}),[earnings,setEarnings]=useState<any>(null),[sharing,setSharing]=useState<Record<string,boolean>>({});const watches=useRef(new Map<string,number>())
 const [selectedJob, setSelectedJob] = useState<string | null>(null)
 const message=(text:string)=>setNotice(text.includes('delivery_partner_')?'Delivery portal setup is pending. Ask the owner to run the Delivery Partner SQL setup once in Supabase.':text)
const refresh=useCallback(async()=>{const {data:{session}}=await supabase.auth.getSession();setUser(session?.user??null);if(!session?.user)return;const activation=await supabase.rpc('activate_my_delivery_partner_account');if(activation.error){message(activation.error.message);return}if(!activation.data){setJobs([]);setNotice(`The website is signed in as ${session.user.email||'an unknown email'}, but that email is not linked to an active delivery boy. In Admin → Delivery, save this exact email for the rider.`);return}const [orders,summary]=await Promise.all([supabase.rpc('delivery_partner_orders'),supabase.rpc('delivery_partner_earnings')]);if(orders.error)message(orders.error.message);else{setJobs(orders.data||[]);setNotice('')}if(!summary.error)setEarnings(summary.data?.[0]||null)},[])
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),10000);return()=>{clearInterval(timer);watches.current.forEach(id=>navigator.geolocation.clearWatch(id))}},[refresh])
 const publish=async(job:Job,lat:number,lng:number,accuracy?:number)=>{
		try{
			const r = await supabase.rpc('set_delivery_location', { p_order_number: job.order_number, p_latitude: lat, p_longitude: lng, p_accuracy: accuracy })
			if (r.error) {
				// Surface the exact DB/RPC error for debugging and user guidance
				console.error('set_delivery_location error', r.error)
				const msg = r.error?.message || String(r.error)
				// If permission denied, give actionable guidance
				if (/access denied/i.test(msg) || /not authorized/i.test(msg)) {
					message('Permission denied. Ensure you are signed in with the delivery partner account linked by the manager, or ask the owner to run the Delivery Partner SQL setup in Supabase.')
				} else {
					message(msg)
				}
				return { error: r.error }
			}
			return { data: r.data }
		}catch(err:any){
			console.error('publish exception', err)
			message(err?.message || 'Unable to publish location')
			return { error: err }
		}
 }

	// per-job last publish metadata for throttling
	const lastPublish = useRef(new Map<string,{ts:number,lat:number,lng:number}>())

	function share(job:Job){
		if(!navigator.geolocation){message('Location is not supported on this phone.');return}
		if(watches.current.has(job.id))return
		setBusy(job.id)

		const throttleMs = 2500
		const minMeters = 10

		const wrapped = (pos:GeolocationPosition)=>{
			try {
				const lat = pos.coords.latitude
				const lng = pos.coords.longitude
				const accuracy = pos.coords.accuracy
				const now = Date.now()
				const prev = lastPublish.current.get(job.id)
				let should = false
				if (!prev) should = true
				else {
					const dt = now - prev.ts
					const dist = calculateDistance(prev.lat, prev.lng, lat, lng)
					if (dt >= throttleMs || dist >= minMeters) should = true
				}
				if (should) {
					// publish numeric coords
					void publish(job, lat, lng, accuracy).then((res:any)=>{
						if (res && res.error) {
							// Stop sharing on permission errors to avoid continuous failures
							if (/access denied/i.test(res.error?.message||String(res.error))) {
								message('Location sharing failed due to permission error. Sign in with the assigned delivery partner account or ask the manager to link your email in Supabase.')
								try { if (watches.current.has(job.id)) { navigator.geolocation.clearWatch(watches.current.get(job.id)!) ; watches.current.delete(job.id) } } catch(e){}
								setBusy('')
								return
							}
							message(res.error?.message || String(res.error))
							return
						}
						lastPublish.current.set(job.id, { ts: now, lat, lng })
						setSharing(s=>({...s,[job.id]:true}))
						setNotice('Live location is sharing with the customer.')
					}).catch(e=>message(e.message)).finally(()=>setBusy(''))
				}
			} catch (err:any) { message(err?.message || 'Failed to process location') }
		}

		const onError = (e:any) => { message('Live location paused: '+e.message) }

		// initial getCurrentPosition to request permission and publish once
		navigator.geolocation.getCurrentPosition((pos)=>{ wrapped(pos) }, e=>{message('Allow location access: '+e.message); setBusy('')}, { enableHighAccuracy:true, timeout:20000 })

		const id = navigator.geolocation.watchPosition(wrapped, onError, { enableHighAccuracy:true, maximumAge:2000, timeout:20000 })
		watches.current.set(job.id, id)
	}
 async function start(job:Job){setBusy(job.id);const r=await supabase.rpc('delivery_partner_set_status',{p_order_id:job.id,p_status:'out_for_delivery'});if(r.error)message(r.error.message);else{setNotice('Delivery started. Connecting live location…');share(job);await refresh()}setBusy('')}
 async function complete(job:Job){
		setBusy(job.id)
		const r = await supabase.rpc('delivery_partner_confirm_delivery', { p_order_id: job.id, p_otp: otp[job.id] || '' })
		if (r.error) message(r.error.message)
		else {
			setNotice('Delivery confirmed. Great work.')
			await refresh()
			try {
				const { data: { session } } = await supabase.auth.getSession()
				const token = session?.access_token
				await fetch('/.netlify/functions/push-trigger', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ order_id: job.order_number, title: 'Delivery confirmed', message: `Your order ${job.order_number} has been delivered.` }) })
			} catch (e) { /* ignore push errors */ }
		}
		setBusy('')
 }

 const signIn=async()=>{const r=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/delivery-partner'}});if(r.error)message(r.error.message)}
 if(!user)return <main className="min-h-screen bg-[#100d0c] p-5 text-white"><div className="mx-auto max-w-md pt-8"><div className="mb-10 flex items-center gap-3"><img src="/images/logo-new.png" className="h-14 w-14 rounded-2xl bg-white object-contain"/><div><p className="text-xs font-bold tracking-widest text-orange-300">CRAVING POINT</p><b>Delivery partner</b></div></div><section className="rounded-3xl border border-orange-400/20 bg-gradient-to-br from-orange-500/20 via-[#211816] to-[#141111] p-7 shadow-2xl"><Bike size={34} className="text-primary"/><p className="mt-8 text-xs font-bold tracking-[.2em] text-orange-200">RIDER WORKSPACE</p><h1 className="mt-2 text-4xl font-black">Deliver with confidence.</h1><p className="mt-5 leading-7 text-white/70">Sign in with the Google account linked by your restaurant manager. You will see only your assigned deliveries.</p><button className="btn-primary mt-7 w-full justify-center" onClick={()=>void signIn()}>Continue with Google</button></section>{notice&&<p className="mt-5 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4 text-sm">{notice}</p>}</div></main>
 return <main className="min-h-screen bg-[#100d0c] p-4 text-white sm:p-7"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between border-b border-white/10 pb-5"><Link to="/" className="flex items-center gap-3"><img src="/images/logo-new.png" className="h-12 w-12 rounded-xl bg-white object-contain"/><div><p className="text-[10px] font-bold tracking-widest text-orange-300">CRAVING POINT</p><b>Rider workspace</b></div></Link><button className="btn-secondary flex gap-2 px-4 py-2 text-xs" onClick={()=>void supabase.auth.signOut()}><LogOut size={15}/>Sign out</button></header><section className="mt-6 rounded-3xl border border-orange-400/20 bg-gradient-to-r from-[#281611] via-[#1c1715] to-[#141212] p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold tracking-[.2em] text-orange-200">ON SHIFT</p><h1 className="mt-2 text-4xl font-black">Your delivery desk</h1><p className="mt-3 text-sm text-white/65">Assigned jobs, live location, customer contact and safe delivery confirmation.</p></div><button className="btn-secondary flex gap-2" onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh jobs</button></div></section><div className="mt-5 grid gap-3 sm:grid-cols-3">{[[<ClipboardList size={17}/>,'Assigned',jobs.length],[<CheckCircle2 size={17}/>,'Completed',earnings?.completed_deliveries||0],[<Bike size={17}/>,'Earnings',cash(earnings?.delivery_earnings)]].map(([icon,label,value])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-[#1a1614] p-4"><div className="flex justify-between text-orange-200">{icon}<span className="text-xs font-bold uppercase">{label}</span></div><b className="mt-3 block text-2xl">{value as any}</b></div>)}</div>{notice&&<p className="mt-5 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-4 text-sm">{notice}</p>}<section className="mt-8"><p className="text-xs font-bold tracking-[.2em] text-orange-300">ASSIGNED TO YOU</p><h2 className="mt-2 text-2xl font-black">Active deliveries</h2>{!jobs.length?<div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-[#171412] p-12 text-center"><Clock3 className="mx-auto text-orange-300"/><h3 className="mt-4 text-xl font-bold">No active deliveries</h3><p className="mt-2 text-sm text-white/60">New jobs appear here after your manager assigns them and marks the order ready.</p></div>:<div className="mt-5 grid gap-5">{jobs.map(job=>{const o=job.payload,active=o.status==='out_for_delivery';return <article key={job.id} className="rounded-3xl border border-white/10 bg-[#1a1614]"><div className="flex flex-wrap justify-between gap-4 border-b border-white/10 p-5"><div><p className="text-xs text-white/45">{job.order_number}</p><h3 className="mt-2 text-2xl font-black">{o.customer?.name||'Customer'}</h3><p className="mt-2 text-sm font-bold text-orange-200">{active?'● ON THE WAY':'READY FOR COLLECTION'}</p></div><b className="text-xl">{cash(o.total)}</b></div><div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]"><div><p className="text-sm text-white/70">{o.items.map((i:any)=>`${i.quantity} × ${i.name}`).join(' · ')}</p><div className="mt-4 flex flex-wrap gap-3"><a className="btn-secondary flex gap-2" href={'tel:'+o.customer?.phone}><Phone size={16}/>Call customer</a><a className="btn-secondary flex gap-2" target="_blank" rel="noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(o.customer?.address||'')}><MapPin size={16}/>Navigate</a></div>{active&&<p className="mt-4 text-sm text-emerald-300">{sharing[job.id]?'● Customer can see your live location':'Location is not sharing yet.'}</p>}</div><div className="flex flex-col gap-3 lg:w-64">{!active?<button className="btn-primary justify-center" disabled={busy===job.id} onClick={()=>void start(job)}><Route size={17}/>Start delivery</button>:<><button className="btn-primary justify-center" disabled={busy===job.id||sharing[job.id]} onClick={()=>share(job)}><Navigation size={17}/>{sharing[job.id]?'Live location on':'Start live location'}</button><div className="flex gap-2"><input className="admin-input min-w-0" inputMode="numeric" maxLength={4} value={otp[job.id]||''} onChange={e=>setOtp(v=>({...v,[job.id]:e.target.value.replace(/\D/g,'')}))} placeholder="Customer OTP"/><button className="btn-secondary" disabled={(otp[job.id]||'').length!==4||busy===job.id} onClick={()=>void complete(job)}>Complete</button></div></>}</div></div>{active && <SelectedJobMap orderNumber={job.order_number} customer={o.customer} customerLocation={o.customerLocation ?? o.customer} />}</article>})}</div>}</section></div></main>
}

	function RiderMiniMap({ orderNumber, customer, customerLocation }: { orderNumber: string, customer?: any, customerLocation?: { lat?: number; lng?: number } | null }){
		const [riderLoc, setRiderLoc] = useState<{lat:number,lng:number,accuracy?:number}|null>(null)
		useEffect(()=>{
			let mounted=true
			const load = async ()=>{
				try{
					const { data } = await supabase.from('delivery_tracking').select('latitude,longitude,accuracy,updated_at').eq('order_number', orderNumber).order('updated_at',{ascending:false}).limit(1)
					if(!mounted) return
					if(data && data.length){ const r = data[0]; setRiderLoc({ lat: Number(r.latitude), lng: Number(r.longitude), accuracy: r.accuracy }) }
				}catch(e){ }
			}
                            
			void load()
			let channel:any=null
			try{
				channel = supabase.channel(`delivery_tracking_order_${orderNumber}`)
				channel.on('postgres_changes',{ event: '*', schema: 'public', table: 'delivery_tracking', filter: `order_number=eq.${orderNumber}` }, (payload:any)=>{
					try{ const rec = payload.new || payload.record || payload; if(rec && typeof rec.latitude==='number' && typeof rec.longitude==='number'){ setRiderLoc({ lat: Number(rec.latitude), lng: Number(rec.longitude), accuracy: rec.accuracy }) } }catch(e){}
				}).subscribe()
			}catch(e){}
			return ()=>{ mounted=false; try{ if(channel) supabase.removeChannel(channel) }catch(e){} }
		},[orderNumber])

		const candidate = customerLocation && typeof customerLocation.lat === 'number' && typeof customerLocation.lng === 'number'
			? { lat: Number(customerLocation.lat), lng: Number(customerLocation.lng) }
			: (customer && typeof customer.lat==='number' && typeof customer.lng==='number') ? { lat: Number(customer.lat), lng: Number(customer.lng) } : null
		if(!candidate) return null
		return <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/40" style={{ height: 180 }}>
			<DeliveryMap customerLocation={candidate} riderLocation={riderLoc?{lat:riderLoc.lat,lng:riderLoc.lng,accuracy:riderLoc.accuracy}:null} height={180} />
		</div>
	}

function SelectedJobMap({ orderNumber, customer, customerLocation }: { orderNumber: string, customer?: any, customerLocation?: { lat?: number; lng?: number } | null }){
	const [riderLoc, setRiderLoc] = useState<{lat:number,lng:number,accuracy?:number}|null>(null)
	useEffect(()=>{
		let mounted = true
		const load = async ()=>{
			try{
				const { data } = await supabase.from('delivery_tracking').select('latitude,longitude,accuracy,updated_at').eq('order_number', orderNumber).order('updated_at',{ascending:false}).limit(1)
				if(!mounted) return
				if(data && data.length){ const r = data[0]; setRiderLoc({ lat: Number(r.latitude), lng: Number(r.longitude), accuracy: r.accuracy }) }
			}catch(e){ }
		}
		void load()
		let channel:any=null
		try{
			channel = supabase.channel(`delivery_tracking_order_${orderNumber}`)
			channel.on('postgres_changes',{ event: '*', schema: 'public', table: 'delivery_tracking', filter: `order_number=eq.${orderNumber}` }, (payload:any)=>{
				try{ const rec = payload.new || payload.record || payload; if(rec && typeof rec.latitude==='number' && typeof rec.longitude==='number'){ setRiderLoc({ lat: Number(rec.latitude), lng: Number(rec.longitude), accuracy: rec.accuracy }) } }catch(e){}
			}).subscribe()
		}catch(e){}
		return ()=>{ mounted=false; try{ if(channel) supabase.removeChannel(channel) }catch(e){} }
	},[orderNumber])

	const candidate = customerLocation && typeof customerLocation.lat === 'number' && typeof customerLocation.lng === 'number'
		? { lat: Number(customerLocation.lat), lng: Number(customerLocation.lng) }
		: (customer && typeof customer.lat==='number' && typeof customer.lng==='number') ? { lat: Number(customer.lat), lng: Number(customer.lng) } : null
	return <div className="mt-5 overflow-hidden rounded-3xl border border-orange-400/20 bg-[#181411] shadow-[0_16px_40px_rgba(0,0,0,0.28)]" style={{ height: 320 }}>
		<DeliveryMap customerLocation={candidate || {lat:19.0175,lng:72.8905}} riderLocation={riderLoc?{lat:riderLoc.lat,lng:riderLoc.lng,accuracy:riderLoc.accuracy}:null} height={320} />
	</div>
}

