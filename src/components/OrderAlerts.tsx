import { useEffect, useRef, useState } from 'react'
import type { OrderRow } from '../hooks/useAdminOrders'
export default function OrderAlerts({orders,loading}:{orders:OrderRow[];loading:boolean}){
 const seen=useRef<Set<string>|null>(null), audio=useRef<AudioContext|null>(null)
 const [enabled,setEnabled]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>()=>{void audio.current?.close()},[])
 useEffect(()=>{if(loading)return;const active=orders.filter(r=>!['awaiting_payment','cancelled'].includes(r.payload.status));const ids=new Set(active.map(r=>r.id));if(seen.current){const count=active.filter(r=>!seen.current!.has(r.id)).length;if(count){setMessage(count+' new order'+(count===1?'':'s')+' received.');if(enabled&&audio.current?.state==='running'){const ctx=audio.current,o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=740;g.gain.setValueAtTime(.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.start();o.stop(ctx.currentTime+.5)}}}seen.current=ids},[orders,loading,enabled])
 return <div className="flex flex-wrap items-center gap-3"><button className="btn-secondary" onClick={async()=>{if(enabled){setEnabled(false);return}try{audio.current ||= new AudioContext();await audio.current.resume();setEnabled(true)}catch{setMessage('Sound is unavailable in this browser. Visual alerts remain active.')}}}>{enabled?'Mute order sound':'Enable order sound'}</button><p role="status">{message}</p><small>Keep this page open for alerts.</small></div>
}
