import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function AppInstallPrompt(){
 const [online,setOnline]=useState(navigator.onLine)
 useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[])
 return !online ? <div role="status" className="fixed inset-x-0 bottom-0 z-[90] bg-amber-500 px-4 py-3 text-center text-sm font-bold text-black"><WifiOff className="mr-2 inline" size={16}/>You are offline. Saved pages remain available; ordering and live tracking need a connection.</div> : null
}
