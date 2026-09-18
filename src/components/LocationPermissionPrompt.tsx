import { useEffect, useState } from 'react'
import { MapPin, X } from 'lucide-react'

const key='craving-point-location-permission'
export default function LocationPermissionPrompt(){
 const [open,setOpen]=useState(()=>localStorage.getItem(key)!=='done'),[message,setMessage]=useState('')
 useEffect(()=>{if(!open)return;const timer=window.setTimeout(()=>setOpen(true),700);return()=>window.clearTimeout(timer)},[open])
 const skip=()=>{localStorage.setItem(key,'done');setOpen(false)}
 const enable=()=>{if(!navigator.geolocation){setMessage('Location is not supported by this browser.');return}setMessage('Requesting location access…');navigator.geolocation.getCurrentPosition(pos=>{const location={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,updatedAt:new Date().toISOString()};localStorage.setItem('craving-point-current-location',JSON.stringify(location));window.dispatchEvent(new CustomEvent('craving-point-location',{detail:location}));localStorage.setItem(key,'done');setOpen(false)},()=>{setMessage('Location was not allowed. You can still enter an address manually or enable it later in your browser settings.')},{enableHighAccuracy:true,timeout:20000,maximumAge:30000})}
 if(!open)return null
 return <aside role="dialog" aria-modal="true" aria-label="Location permission" className="fixed bottom-4 left-4 right-4 z-[95] mx-auto max-w-md rounded-2xl border border-white/15 bg-[#211918] p-5 shadow-2xl"><button className="absolute right-3 top-3 p-2 text-white/60" aria-label="Not now" onClick={skip}><X size={17}/></button><MapPin className="text-primary" size={26}/><h2 className="mt-3 text-lg font-black">Enable your location?</h2><p className="mt-2 pr-4 text-sm leading-6 text-white/70">It fills the customer delivery location. For delivery partners, location is shared only after they start an assigned delivery. Admin location is never sent to customers.</p>{message&&<p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}<div className="mt-5 flex gap-3"><button className="btn-primary" onClick={enable}>Enable location</button><button className="btn-secondary" onClick={skip}>Not now</button></div></aside>
}
