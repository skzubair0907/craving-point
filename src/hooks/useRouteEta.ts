import { useEffect, useState } from 'react'

export function useRouteEta(origin?: {lat:number,lng:number}|null, dest?: {lat:number,lng:number}|null, ttlSeconds = 300){
  const [duration, setDuration] = useState<number|null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(()=>{
    if(!origin || !dest) { setDuration(null); return }
    let mounted = true
    setLoading(true)
    void (async ()=>{
      try{
        const res = await fetch('/.netlify/functions/route-eta', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ origin, dest, ttlSeconds }) })
        if(!res.ok) throw new Error('ETA request failed')
        const j = await res.json()
        if(!mounted) return
        if(typeof j.duration_seconds === 'number') setDuration(j.duration_seconds)
      }catch(e){ console.warn('useRouteEta error', e); if(mounted) setDuration(null) }
      finally{ if(mounted) setLoading(false) }
    })()
    return ()=>{ mounted=false }
  },[origin?.lat, origin?.lng, dest?.lat, dest?.lng, ttlSeconds])
  return { duration, loading }
}

export default useRouteEta
