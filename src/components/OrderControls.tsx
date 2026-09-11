import { useState } from 'react'
import { useRestaurantStore } from '../store/useRestaurantData'
export default function OrderControls(){
 const {catalog,publish}=useRestaurantStore();const s=catalog.restaurantSettings
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function save(patch:Record<string,unknown>){setBusy(true);try{await publish('restaurantSettings',{...useRestaurantStore.getState().catalog.restaurantSettings,...patch});setMessage('Ordering controls updated.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to update.')}finally{setBusy(false)}}
 return <section className="card-premium p-5 space-y-4"><h2 className="text-xl font-bold">Restaurant controls</h2><p>{s.online_ordering_enabled?'Accepting orders':'Ordering paused'}</p><div className="flex flex-wrap gap-3"><button className="btn-primary" disabled={busy} onClick={()=>void save({online_ordering_enabled:!s.online_ordering_enabled})}>{s.online_ordering_enabled?'Pause orders':'Accept orders'}</button><label>Preparation time<select className="admin-input block" disabled={busy} value={s.preparation_minutes||30} onChange={e=>void save({preparation_minutes:Number(e.target.value)})}>{[...new Set([15,20,30,45,60,90,s.preparation_minutes||30])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label></div><p role="status">{message}</p></section>
}
