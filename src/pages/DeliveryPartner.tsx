import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Bike, CheckCircle2, MapPin, Navigation, Phone, RefreshCw } from 'lucide-react'

type PartnerOrder = { id:string; order_number:string; payload:any; created_at:string }

export default function DeliveryPartner() {
  const [user,setUser]=useState<any>(null),[orders,setOrders]=useState<PartnerOrder[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState('')
  const watches=useRef(new Map<string,number>())
  const refresh=useCallback(async()=>{
    const {data:{session}}=await supabase.auth.getSession(); setUser(session?.user??null)
    if(!session?.user){setOrders([]);return}
    const r=await supabase.rpc('delivery_partner_orders')
    if(r.error){setMessage(r.error.message);return}; setOrders(r.data||[])
  },[])
  useEffect(()=>{void refresh();const t=window.setInterval(()=>void refresh(),10000);return()=>{window.clearInterval(t);watches.current.forEach(id=>navigator.geolocation.clearWatch(id))}},[refresh])
  async function signIn(){const r=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/delivery-partner'}});if(r.error)setMessage(r.error.message)}
  async function writeLocation(order:PartnerOrder,pos:GeolocationPosition){
    const r=await supabase.rpc('set_delivery_location',{p_order_number:order.order_number,p_latitude:pos.coords.latitude,p_longitude:pos.coords.longitude,p_accuracy:pos.coords.accuracy})
    if(r.error) throw new Error(r.error.message)
  }
  function startSharing(order:PartnerOrder){
    if(!navigator.geolocation){setMessage('This phone does not support location sharing.');return}
    if(watches.current.has(order.id)){setMessage('Live location is already on for this delivery.');return}
    setBusy(order.id)
    const watch=navigator.geolocation.watchPosition(pos=>{void writeLocation(order,pos).then(()=>setMessage('Live rider location is sharing with the customer.')).catch(e=>setMessage(e.message)).finally(()=>setBusy(''))},e=>{setMessage('Location permission is needed: '+e.message);setBusy('')},{enableHighAccuracy:true,maximumAge:5000,timeout:15000})
    watches.current.set(order.id,watch)
  }
  function stopSharing(id:string){const watch=watches.current.get(id);if(watch!==undefined)navigator.geolocation.clearWatch(watch);watches.current.delete(id);setMessage('Live location sharing stopped.')}
  async function updateStatus(order:PartnerOrder,status:'out_for_delivery'|'delivered'){
    setBusy(order.id);const r=await supabase.rpc('delivery_partner_set_status',{p_order_id:order.id,p_status:status});if(r.error)setMessage(r.error.message);else {if(status==='delivered')stopSharing(order.id);setMessage(status==='delivered'?'Delivery completed.':'Delivery started. Turn on live location now.');await refresh()}setBusy('')
  }
  return <main className="min-h-screen bg-[#120f10] px-4 py-6 text-white"><div className="mx-auto max-w-3xl space-y-6"><header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5"><Link to="/" className="flex items-center gap-3"><img src="/images/logo.png" alt="Craving Point" className="h-12 w-12 rounded-lg object-contain bg-white"/><span className="font-black">Delivery Partner</span></Link><Link className="btn-secondary px-4 py-2 text-xs" to="/">Storefront</Link></header>{!user?<section className="card-premium mx-auto max-w-lg p-7"><Bike className="text-primary" size={36}/><p className="eyebrow mt-4">Craving Point riders</p><h1 className="section-title mt-2">Deliver with confidence.</h1><p className="mt-4 text-white/70">Sign in with the Google account that your manager linked to your delivery-rider profile. You will only see orders assigned to you.</p><button className="btn-primary mt-6" onClick={()=>void signIn()}>Continue with Google</button></section>:<><section className="card-premium flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-sm text-white/60">Signed in as</p><p className="font-bold">{user.email}</p></div><button className="btn-secondary flex items-center gap-2" onClick={()=>void refresh()}><RefreshCw size={16}/>Refresh jobs</button></section>{message&&<p role="status" className="rounded-xl border border-primary/60 bg-primary/10 p-4 text-sm">{message}</p>}<section className="space-y-4"><div><p className="eyebrow">Your assigned deliveries</p><h1 className="section-title mt-2">Today’s jobs</h1></div>{!orders.length&&<div className="card-premium p-6 text-white/70">No ready or active deliveries are assigned to you. Ask the restaurant manager to assign your Google account to your rider profile.</div>}{orders.map(order=>{const o=order.payload||{}, active=o.status==='out_for_delivery', sharing=watches.current.has(order.id);return <article key={order.id} className="card-premium space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-white/60">{order.order_number}</p><h2 className="mt-1 text-xl font-black">{o.customer?.name||'Customer'}</h2><p className="mt-1 text-primary font-bold">{active?'Out for delivery':'Ready to collect'}</p></div><span className="rounded-full border border-white/15 px-3 py-1 text-sm">₹{Number(o.total||0).toFixed(2)}</span></div><div className="grid gap-3 border-y border-white/10 py-4 sm:grid-cols-2"><a className="flex gap-2 text-white/85" href={'tel:'+String(o.customer?.phone||'')}><Phone size={18} className="text-primary"/>{o.customer?.phone||'Phone unavailable'}</a><a className="flex gap-2 text-white/85" target="_blank" rel="noreferrer" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.customer?.address||'')}><MapPin size={18} className="text-primary"/><span>{o.customer?.address||'Address unavailable'}</span></a></div><p className="text-sm text-white/70">{(o.items||[]).map((i:any)=>`${i.quantity} × ${i.name}`).join(', ')}</p>{!active?<button className="btn-primary" disabled={busy===order.id} onClick={()=>void updateStatus(order,'out_for_delivery')}><Bike size={17} className="mr-2 inline"/>Start delivery</button>:<div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={busy===order.id} onClick={()=>startSharing(order)}><Navigation size={17} className="mr-2 inline"/>{sharing?'Live location sharing':'Share live location'}</button>{sharing&&<button className="btn-secondary" onClick={()=>stopSharing(order.id)}>Stop sharing</button>}<button className="btn-secondary" disabled={busy===order.id} onClick={()=>void updateStatus(order,'delivered')}><CheckCircle2 size={17} className="mr-2 inline"/>Mark delivered</button></div>}</article>})}</section></>}</div></main>
}
