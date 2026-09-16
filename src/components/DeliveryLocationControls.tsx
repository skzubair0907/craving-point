import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import DeliveryHistoryPanel from './DeliveryHistoryPanel'

export default function DeliveryLocationControls({ orderId, orderNumber, onMessage }:{orderId:string;orderNumber:string;onMessage:(message:string)=>void}) {
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
    if(!navigator.geolocation){onMessage('Location is unavailable in this browser. Enter rider coordinates manually.');return}
    setBusy(true)
    navigator.geolocation.getCurrentPosition(position=>{setLatitude(String(position.coords.latitude));setLongitude(String(position.coords.longitude));setAccuracy(String(Math.round(position.coords.accuracy)));setBusy(false);onMessage('Current device location is ready. Send it to the customer map.')},()=>{setBusy(false);onMessage('Location permission was denied. Enter rider coordinates manually.')},{enableHighAccuracy:true,timeout:15000,maximumAge:10000})
  }
  const save=async()=>{
    const lat=Number(latitude),lng=Number(longitude),meters=accuracy===''?null:Number(accuracy)
    if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180||meters!==null&&(!Number.isFinite(meters)||meters<0)){onMessage('Enter a valid latitude, longitude, and optional accuracy.');return}
    setBusy(true)
    try{await publish(lat,lng,meters);onMessage('Rider location sent. The customer map updates within 3 seconds.')}catch(error){onMessage(error instanceof Error?error.message:'Unable to save rider location.')}finally{setBusy(false)}
  }
  const startSharing=()=>{if(!navigator.geolocation){onMessage('Location is unavailable in this browser.');return}if(watchId.current!==null)return;setSharing(true);setBusy(true);onMessage('Starting live rider location sharing…');watchId.current=navigator.geolocation.watchPosition(async position=>{try{await publish(position.coords.latitude,position.coords.longitude,position.coords.accuracy);setLatitude(String(position.coords.latitude));setLongitude(String(position.coords.longitude));setAccuracy(String(Math.round(position.coords.accuracy)));onMessage('Live rider location is sharing. The customer map updates within 3 seconds.')}catch(error){onMessage(error instanceof Error?error.message:'Unable to share rider location.')}finally{setBusy(false)}},()=>{setBusy(false);setSharing(false);watchId.current=null;onMessage('Location permission was denied. Use the delivery phone and allow location permission.')},{enableHighAccuracy:true,timeout:15000,maximumAge:5000})}
  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3" data-order-id={orderId}>
      <div>
        <h3 className="font-bold">Live rider location</h3>
        <p className="text-sm text-accent/70">Open this on the delivery rider’s phone. Start sharing to update the customer map automatically.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" type="button" disabled={busy||sharing} onClick={startSharing}>{busy ? 'Starting…' : 'Start live sharing'}</button>
        {sharing && <button className="btn-secondary" type="button" onClick={stopSharing}>Stop live sharing</button>}
        <button className="btn-secondary" type="button" onClick={()=>setShowHistory(!showHistory)}>{showHistory ? 'Hide recent updates' : 'View recent updates'}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input aria-label="Rider latitude" className="admin-input" type="number" step="any" placeholder="Latitude" value={latitude} onChange={event=>setLatitude(event.target.value)} />
        <input aria-label="Rider longitude" className="admin-input" type="number" step="any" placeholder="Longitude" value={longitude} onChange={event=>setLongitude(event.target.value)} />
        <input aria-label="Location accuracy" className="admin-input" type="number" min="0" step="1" placeholder="Accuracy (metres)" value={accuracy} onChange={event=>setAccuracy(event.target.value)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary" type="button" disabled={busy} onClick={currentLocation}>Use this device location once</button>
        <button className="btn-secondary" type="button" disabled={busy} onClick={()=>void save()}>{busy ? 'Sending…' : 'Send one location update'}</button>
      </div>

      {showHistory && <DeliveryHistoryPanel orderNumber={orderNumber} />}
    </section>
  )
}

