import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeliveryLocationControls({ orderId, orderNumber, onMessage }:{orderId:string;orderNumber:string;onMessage:(message:string)=>void}) {
  const [latitude,setLatitude]=useState('')
  const [longitude,setLongitude]=useState('')
  const [accuracy,setAccuracy]=useState('')
  const [busy,setBusy]=useState(false)
  const currentLocation=()=>{
    if(!navigator.geolocation){onMessage('Location is unavailable in this browser. Enter rider coordinates manually.');return}
    setBusy(true)
    navigator.geolocation.getCurrentPosition(position=>{setLatitude(String(position.coords.latitude));setLongitude(String(position.coords.longitude));setAccuracy(String(Math.round(position.coords.accuracy)));setBusy(false);onMessage('Current device location is ready. Send it to the customer map.')},()=>{setBusy(false);onMessage('Location permission was denied. Enter rider coordinates manually.')},{enableHighAccuracy:true,timeout:15000,maximumAge:10000})
  }
  const save=async()=>{
    const lat=Number(latitude),lng=Number(longitude),meters=accuracy===''?null:Number(accuracy)
    if(!Number.isFinite(lat)||lat < -90||lat > 90||!Number.isFinite(lng)||lng < -180||lng > 180||meters!==null&&(!Number.isFinite(meters)||meters<0)){onMessage('Enter a valid latitude, longitude, and optional accuracy.');return}
    setBusy(true)
    try{const {error}=await supabase.rpc('set_delivery_location',{p_order_number:orderNumber,p_latitude:lat,p_longitude:lng,p_accuracy:meters});if(error)throw error;onMessage('Rider location sent. The customer map updates within 15 seconds.')}catch(error){onMessage(error instanceof Error?error.message:'Unable to save rider location.')}finally{setBusy(false)}
  }
  return <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3" data-order-id={orderId}><div><h3 className="font-bold">Live rider location</h3><p className="text-sm text-accent/70">Use the delivery phone's location, then send it to the customer map.</p></div><div className="grid gap-3 sm:grid-cols-3"><input aria-label="Rider latitude" className="admin-input" type="number" step="any" placeholder="Latitude" value={latitude} onChange={event=>setLatitude(event.target.value)}/><input aria-label="Rider longitude" className="admin-input" type="number" step="any" placeholder="Longitude" value={longitude} onChange={event=>setLongitude(event.target.value)}/><input aria-label="Location accuracy" className="admin-input" type="number" min="0" step="1" placeholder="Accuracy (metres)" value={accuracy} onChange={event=>setAccuracy(event.target.value)}/></div><div className="flex flex-wrap gap-3"><button className="btn-secondary" type="button" disabled={busy} onClick={currentLocation}>Use this device location</button><button className="btn-primary" type="button" disabled={busy} onClick={()=>void save()}>{busy?'Sending…':'Send location to customer map'}</button></div></section>
}
