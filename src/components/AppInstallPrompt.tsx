import { useEffect, useState } from 'react'
import { Download, WifiOff, X } from 'lucide-react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function AppInstallPrompt(){
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null)
 const [online,setOnline]=useState(navigator.onLine)
 const [dismissed,setDismissed]=useState(()=>localStorage.getItem('craving-point-install-dismissed')==='1')
 useEffect(()=>{const ready=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent)};const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('beforeinstallprompt',ready);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('online',on);window.removeEventListener('offline',off)}},[])
 const dismiss=()=>{localStorage.setItem('craving-point-install-dismissed','1');setDismissed(true)}
 const install=async()=>{if(!installEvent)return;await installEvent.prompt();await installEvent.userChoice;setInstallEvent(null)}
 return <>{!online&&<div role="status" className="fixed inset-x-0 bottom-0 z-[90] bg-amber-500 px-4 py-3 text-center text-sm font-bold text-black"><WifiOff className="mr-2 inline" size={16}/>You are offline. Saved pages remain available; ordering and live tracking need a connection.</div>}{installEvent&&!dismissed&&<aside className="cp-install-prompt" aria-label="Install Craving Point"><img src="/images/logo-new.png" alt=""/><div className="cp-install-copy"><strong>Install Craving Point</strong><span>Open faster from your home screen.</span></div><button type="button" className="cp-install-action" onClick={()=>void install()}><Download size={16}/>Install</button><button type="button" className="cp-install-close" aria-label="Dismiss install prompt" onClick={dismiss}><X size={18}/></button></aside>}</>
}
