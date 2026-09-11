import { randomId } from '../lib/randomId'
import { useState } from 'react'
import { useRestaurantStore } from '../store/useRestaurantData'
import type { MenuItem } from '../types'
export default function CatalogActions({item}:{item:MenuItem}) {
 const {catalog,publish}=useRestaurantStore(),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function run(action:'duplicate'|'delete'|'restore'|'availability'){
  if(action==='delete'&&!window.confirm('Move '+item.name+' to deleted products? It can be restored later.'))return
  setBusy(true);setError('')
  try{const products=catalog.menuItems
   const next=action==='availability'?products.map(p=>p.id===item.id?{...p,is_available:!p.is_available}:p):action==='duplicate'?[...products,{...structuredClone(item),id:randomId(),slug:item.slug+'-copy-'+randomId().slice(0,8),name:item.name+' (copy)',is_available:false,deleted_at:null}]:products.map(p=>p.id===item.id?{...p,deleted_at:action==='delete'?new Date().toISOString():null,is_available:false}:p)
   await publish('menuItems',next)
  }catch(e){setError(e instanceof Error?e.message:'Unable to update product.')}finally{setBusy(false)}
 }
 return <div className="flex flex-wrap gap-3 mt-2">{!item.deleted_at&&<button disabled={busy} className="btn-secondary" onClick={()=>void run('availability')}>{item.is_available?'Mark sold out':'Make available'}</button>}<button disabled={busy} onClick={()=>void run('duplicate')}>Duplicate</button><button disabled={busy} onClick={()=>void run(item.deleted_at?'restore':'delete')}>{item.deleted_at?'Restore (hidden)':'Delete'}</button>{error&&<p role="alert">{error}</p>}</div>
}
