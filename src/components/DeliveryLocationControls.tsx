import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import DeliveryHistoryPanel from './DeliveryHistoryPanel'
import { DeliveryMap } from './DeliveryMap2'

export default function DeliveryLocationControls({ orderId, orderNumber, customerLocation, onMessage }:{orderId:string;orderNumber:string;customerLocation?:{lat?:number;lng?:number}|null;onMessage:(message:string)=>void}) {
  const [latitude,setLatitude]=useState('')
  const [longitude,setLongitude]=useState('')
  const [accuracy,setAccuracy]=useState('')
  const [busy,setBusy]=useState(false)
  const [sharing,setSharing]=useState(false)
  const watchId=useRef<number|null>(null)
  const [showHistory,setShowHistory]=useState(false)
  const stopSharing=()=>{if(watchId.current!==null){navigator.geolocation.clearWatch(watchId.current);watchId.current=null}setSharing(false);onMessage('Live rider location sharing stopped.')}
  useEffect(()=>()=>{if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current)},[])
  const publish=async(lat:number,lng:number,meters:number|null)=>{
    const {error}=await supabase.rpc('set_delivery_location',{p_order_number:orderNumber,p_latitude:lat,p_longitude:lng,p_accuracy:meters})
    if(error)throw error
  }
  const currentLocation=()=>{
    if(!navigator.geolocation){onMessage('Location is unavailable on this device. Enter the rider location manually.');return}
    setBusy(true)
    navigator.geolocation.getCurrentPosition(position=>{setLatitude(String(position.coords.latitude));setLongitude(String(position.coords.longitude));setAccuracy(String(Math.round(position.coords.accuracy)));setBusy(false);onMessage('Phone location is ready. Send it to the customer map.')},()=>{setBusy(false);onMessage('Location permission was denied. Enter the rider location manually.')},{enableHighAccuracy:true,timeout:15000,maximumAge:10000})
  }
  const save=async()=>{
    const lat=Number(latitude),lng=Number(longitude),meters=accuracy===''?null:Number(accuracy)
    if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180||meters!==null&&(!Number.isFinite(meters)||meters<0)){onMessage('Add valid latitude, longitude, and location accuracy.');return}
    setBusy(true)
    try{await publish(lat,lng,meters);onMessage('Customer location has been updated.') }catch(error){onMessage(error instanceof Error?error.message:'Unable to save rider location.')}finally{setBusy(false)}
  }
  const startSharing=()=>{if(!navigator.geolocation){onMessage('Location is unavailable on this device.');return}if(watchId.current!==null)return;setSharing(true);setBusy(true);onMessage('Live delivery tracking is starting…');watchId.current=navigator.geolocation.watchPosition(async position=>{try{await publish(position.coords.latitude,position.coords.longitude,position.coords.accuracy);setLatitude(String(position.coords.latitude));setLongitude(String(position.coords.longitude));setAccuracy(String(Math.round(position.coords.accuracy)));onMessage('The customer is seeing the live rider location now.')}catch(error){onMessage(error instanceof Error?error.message:'Unable to share rider location.')}finally{setBusy(false)}},()=>{setBusy(false);setSharing(false);watchId.current=null;onMessage('Location permission was denied. Please allow access on the rider phone.')},{enableHighAccuracy:true,timeout:15000,maximumAge:5000})}
  return (
    <section className="rounded-2xl border border-orange-400/25 bg-gradient-to-br from-[#201913] via-[#171311] to-[#0f0d0b] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.3)]" data-order-id={orderId}>
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">Delivery</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Live rider location</h3>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${sharing ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-orange-400/30 bg-orange-500/10 text-orange-200'}`}>
          {sharing ? 'Live' : 'Ready'}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <p className="text-base leading-relaxed text-white/80">
          Open this on the delivery rider&apos;s phone. Start sharing to update the customer map automatically.
        </p>

        <button
          className="flex w-full items-center justify-center rounded-xl border border-orange-300/40 bg-gradient-to-r from-[#f97316] to-[#ef6a1b] px-5 py-4 text-[13px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_28px_rgba(249,115,22,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={busy || sharing}
          onClick={startSharing}
        >
          {busy ? 'Starting…' : 'Start live sharing'}
        </button>

        <button
          className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/20 hover:bg-slate-800/70"
          type="button"
          onClick={()=>setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide recent updates' : 'View recent updates'}
        </button>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/35 p-3 text-sm text-white/70">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Latitude</span>
            <input aria-label="Rider latitude" className="w-full border-0 bg-transparent text-base font-medium text-white outline-none placeholder:text-white/30" type="number" step="any" placeholder="12.345678" value={latitude} onChange={event=>setLatitude(event.target.value)} />
          </label>
          <label className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/35 p-3 text-sm text-white/70">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Longitude</span>
            <input aria-label="Rider longitude" className="w-full border-0 bg-transparent text-base font-medium text-white outline-none placeholder:text-white/30" type="number" step="any" placeholder="76.456789" value={longitude} onChange={event=>setLongitude(event.target.value)} />
          </label>
          <label className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/35 p-3 text-sm text-white/70">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Accuracy</span>
            <input aria-label="Location accuracy" className="w-full border-0 bg-transparent text-base font-medium text-white outline-none placeholder:text-white/30" type="number" min="0" step="1" placeholder="50 m" value={accuracy} onChange={event=>setAccuracy(event.target.value)} />
          </label>
        </div>

        <div className="space-y-3">
          <button
            className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-slate-900/55 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/20 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
            disabled={busy}
            onClick={currentLocation}
          >
            Use this device location once
          </button>
          <button
            className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-slate-900/55 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/20 hover:bg-slate-800/70 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
            disabled={busy}
            onClick={()=>void save()}
          >
            {busy ? 'Sending…' : 'Send one location update'}
          </button>
          {sharing && (
            <button
              className="flex w-full items-center justify-center rounded-xl border border-red-400/25 bg-red-500/5 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/10"
              type="button"
              onClick={stopSharing}
            >
              Stop live sharing
            </button>
          )}
        </div>
      </div>

      {showHistory && <div className="mt-4"><DeliveryHistoryPanel orderNumber={orderNumber} /></div>}
      {customerLocation && typeof customerLocation.lat === 'number' && typeof customerLocation.lng === 'number' && <div className="mt-5 overflow-hidden rounded-xl border border-white/10"><DeliveryMap customerLocation={{lat:customerLocation.lat,lng:customerLocation.lng}} riderLocation={latitude.trim()!==''&&longitude.trim()!==''&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))?{lat:Number(latitude),lng:Number(longitude)}:null} height="250px" /></div>}
    </section>
  )
}
