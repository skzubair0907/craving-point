import { useEffect, useState } from 'react'
import { Download, WifiOff, X } from 'lucide-react'

type InstallEvent = Event & { prompt:()=>Promise<void>; userChoice:Promise<{outcome:string}> }

export default function AppInstallPrompt(){
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null),[online,setOnline]=useState(navigator.onLine),[dismissed,setDismissed]=useState(()=>localStorage.getItem('craving-point-install-dismissed')==='1')
 useEffect(()=>{const ready=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent)};const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('beforeinstallprompt',ready);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[])
 const dismiss=()=>{localStorage.setItem('craving-point-install-dismissed','1');setDismissed(true)}
 return <>{!online&&<div role="status" className="fixed inset-x-0 bottom-0 z-[90] bg-amber-500 px-4 py-3 text-center text-sm font-bold text-black"><WifiOff className="mr-2 inline" size={16}/>You are offline. Saved pages remain available; ordering and live tracking need a connection.</div>}{installEvent&&!dismissed&&<aside className="fixed bottom-4 left-4 right-4 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-[#211918] p-4 shadow-2xl"><img src="/images/logo-new.png" alt="" className="h-10 w-10 rounded-lg bg-white object-contain"/><div className="min-w-0 flex-1"><p className="font-bold">Install Craving Point</p><p className="text-xs text-white/65">Open it quickly like an app.</p></div><button className="btn-primary px-3 py-2 text-xs" onClick={()=>void installEvent.prompt().then(()=>installEvent.userChoice).then(()=>setInstallEvent(null))}><Download size={15}/></button><button aria-label="Dismiss install prompt" className="p-2 text-white/70" onClick={dismiss}><X size={17}/></button></aside>}</>
}
