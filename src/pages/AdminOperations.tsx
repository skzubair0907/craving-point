import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRestaurantData } from '../store/useRestaurantData'

type Kind='inventory'|'delivery'|'support'|'staff'|'audit'|'notifications'
const tables:Record<Kind,string>={inventory:'inventory',delivery:'delivery_staff',support:'customer_support',staff:'admin_staff',audit:'admin_audit',notifications:'admin_notifications'}
const permissionSections=['orders','products','inventory','delivery','support','reviews','coupons','settings','content','reports','audit','notifications','staff']
const roleDefaults:Record<string,string[]>={super_admin:permissionSections,order_manager:['orders','notifications'],product_manager:['products'],inventory_manager:['inventory'],delivery_manager:['delivery','orders'],support_staff:['support','orders','reviews','notifications']}
export default function AdminOperations({kind}:{kind:Kind}) {
 const {menuItems}=useRestaurantData()
 const [rows,setRows]=useState<any[]>([]),[history,setHistory]=useState<any[]>([]),[page,setPage]=useState(0),[count,setCount]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[draft,setDraft]=useState<any>(null),[read,setRead]=useState<number[]>([])
 const [auditSearch,setAuditSearch]=useState('')
 const [auditFilter,setAuditFilter]=useState<'all'|'inventory'|'storefront'|'reports'|'staff'|'support'>('all')
 const [auditRange,setAuditRange]=useState<'all'|'today'|'7d'|'30d'>('all')
 const formatActionLabel=(action:unknown)=>{
  const actionText=typeof action==='string'?action:''
  const labels: Record<string,string> = {
   'reports.export': 'Sales report exported',
   'storefront.update': 'Storefront content updated',
   'storefront.insert': 'Storefront content added',
   'inventory.adjust': 'Stock adjusted',
   'admin_staff.insert': 'Staff access granted',
   'admin_staff.update': 'Staff permissions updated',
   'admin_staff.delete': 'Staff access removed',
   'delivery_staff.insert': 'Delivery rider added',
   'delivery_staff.update': 'Delivery rider updated',
   'customer_support.insert': 'Support request created',
   'customer_support.update': 'Support request updated',
   'admin_notifications.insert': 'Customer alert created',
  }
  if (labels[actionText]) return labels[actionText]
  if (!actionText) return 'System activity'
  return actionText
   .split('.')
   .flatMap(part => part.split('_'))
   .filter(Boolean)
   .map(part => part.charAt(0).toUpperCase() + part.slice(1))
   .join(' ')
 }
 const summarizeAudit=(details:any)=>{
  if (!details || typeof details !== 'object') return 'No extra details available.'
  if (details.summary) return details.summary
  if (details.reason) return details.reason
  if (details.note) return details.note
  if (details.operation) return `Action: ${details.operation}`
  if (details.change !== undefined || details.quantity !== undefined) {
   const parts = []
   if (details.change !== undefined) parts.push(`Adjusted by ${details.change}`)
   if (details.quantity !== undefined) parts.push(`Current quantity ${details.quantity}`)
   return parts.join(' • ')
  }
  if (details.to) return `Updated to ${details.to}`
  if (details.name) return `Updated ${details.name}`
  if (details.status) return `Status changed to ${details.status}`
  return 'Review in the activity record for full context.'
 }
 const badgeColor = (action: unknown) => {
  const actionText=typeof action==='string'?action:''
  if (actionText.includes('inventory')) return 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
  if (actionText.includes('storefront')) return 'bg-blue-500/15 text-blue-200 border border-blue-400/30'
  if (actionText.includes('report')) return 'bg-violet-500/15 text-violet-200 border border-violet-400/30'
  if (actionText.includes('staff')) return 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30'
  if (actionText.includes('support')) return 'bg-pink-500/15 text-pink-200 border border-pink-400/30'
  return 'bg-slate-500/15 text-slate-200 border border-slate-400/30'
 }
 const auditRows = kind === 'audit' ? rows.filter(row => {
  const action=typeof row?.action==='string'?row.action:''
  const text = `${action} ${row?.record_id || ''} ${row?.details ? JSON.stringify(row.details) : ''}`.toLowerCase()
  const matchesSearch = text.includes(auditSearch.toLowerCase())
  const matchesFilter = auditFilter === 'all' || action.startsWith(auditFilter)
  const createdAt = new Date(row?.created_at).getTime()
  const cutoff = Date.now() - (auditRange === 'today' ? 24*60*60*1000 : auditRange === '7d' ? 7*24*60*60*1000 : auditRange === '30d' ? 30*24*60*60*1000 : 0)
  const matchesRange = auditRange === 'all' || createdAt >= cutoff
  return matchesSearch && matchesFilter && matchesRange
 }) : rows
 const auditSummary = kind === 'audit' ? {
  total: rows.length,
  visible: auditRows.length,
  today: rows.filter(row => Date.now() - new Date(row.created_at).getTime() <= 24*60*60*1000).length,
  inventory: rows.filter(row => typeof row?.action==='string' && row.action.startsWith('inventory')).length,
  storefront: rows.filter(row => typeof row?.action==='string' && row.action.startsWith('storefront')).length,
  reports: rows.filter(row => typeof row?.action==='string' && row.action.startsWith('reports')).length,
  staff: rows.filter(row => typeof row?.action==='string' && (row.action.startsWith('admin_staff') || row.action.startsWith('delivery_staff'))).length,
  support: rows.filter(row => typeof row?.action==='string' && row.action.startsWith('customer_support')).length,
 } : null
 const refresh=useCallback(async()=>{setBusy(true);try{
  const order=kind==='inventory'?'product_id':kind==='delivery'?'name':'created_at'
  const {data,error,count}=await supabase.from(tables[kind]).select('*',{count:'exact'}).order(order,{ascending:kind==='inventory'||kind==='delivery'}).range(page*25,page*25+24)
  if(error)throw error;setRows(data||[]);setCount(count||0)
  if(kind==='notifications'){const r=await supabase.from('notification_reads').select('notification_id');if(r.error)throw r.error;setRead((r.data||[]).map((x:any)=>x.notification_id))}
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to load records. Check database setup and permissions.')}finally{setBusy(false)}},[kind,page])
 useEffect(()=>{setDraft(null);setMessage('');void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>clearInterval(timer)},[refresh])
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
  let result
  if(kind==='inventory')result=await supabase.rpc('adjust_stock',{p_product:draft.product_id,p_change:Number(draft.change),p_warning:Number(draft.warning_level),p_reason:draft.reason})
  else if(kind==='staff')result=await supabase.from(tables[kind]).upsert(draft,{onConflict:'user_id'})
  else if(draft.id)result=await supabase.from(tables[kind]).update(draft).eq('id',draft.id)
  else result=await supabase.from(tables[kind]).insert(draft)
  if(result.error)throw new Error(result.error.message);setDraft(null);await refresh();setMessage('Saved successfully.')
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}}
 const field=(key:string,label:string,type='text')=><label className="grid gap-2">{label}<input className="admin-input" type={type} required value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>
 const add=()=>setDraft(kind==='inventory'?{product_id:menuItems[0]?.id,change:0,warning_level:5,reason:''}:kind==='delivery'?{name:'',phone:'',email:'',active:true}:kind==='staff'?{user_id:'',role:'order_manager',active:true,permissions:{orders:['view','edit'],notifications:['view']}}:{customer_phone:'',subject:'',notes:'',status:'open'})
 async function showHistory(id:string){const r=await supabase.from('stock_history').select('*').eq('product_id',id).order('created_at',{ascending:false}).limit(50);if(r.error)setMessage(r.error.message);else setHistory(r.data||[])}
 return <section className="p-4 sm:p-8 space-y-6"><header className="card-premium overflow-hidden p-5 sm:p-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="eyebrow">Restaurant admin</p><h1 className="section-title mt-2 capitalize">{kind}</h1></div><div className="flex gap-3"><button className="btn-secondary" onClick={()=>void refresh()} disabled={busy}>Refresh</button>{!['audit','notifications'].includes(kind)&&<button className="btn-primary" onClick={add}>{kind==='inventory'?'Adjust stock':'Add record'}</button>}</div></div>{kind==='inventory'&&<p className="mt-4 text-sm text-white/70">Products without a stock record are made to order. Set an opening stock balance to enable quantity limits. Pending online orders reserve stock until cancelled.</p>}{kind==='staff'&&<p className="mt-4 text-sm text-white/70">Create the staff member in Supabase Authentication first, then enter their user ID here. Permissions are enforced by the database.</p>}<div className="mt-5 grid gap-3 sm:grid-cols-3">{[
  {label:'Status', value: kind === 'audit' ? 'Live review' : 'Operational'},
  {label:'Records', value: String(rows.length)},
  {label:'Page view', value: kind === 'notifications' ? 'Alerts' : kind === 'inventory' ? 'Stock balance' : 'Recent activity'},
].map(item => <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-white/60">{item.label}</p><p className="mt-2 text-xl font-bold text-white">{item.value}</p></div>)}</div></header>
 {kind==='audit'&&<div className="card-premium p-4 space-y-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-col gap-3 md:flex-row md:items-center"><input className="admin-input md:max-w-md" value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} placeholder="Search activity log..." aria-label="Search activity log" /><div className="flex flex-wrap gap-2 text-sm">{(['all','inventory','storefront','reports','staff','support'] as const).map(filter => <button type="button" key={filter} className={auditFilter===filter ? 'btn-primary px-3 py-2 text-xs' : 'btn-secondary px-3 py-2 text-xs'} onClick={()=>setAuditFilter(filter)}>{filter === 'all' ? 'All' : filter === 'storefront' ? 'Storefront' : filter === 'reports' ? 'Reports' : filter === 'staff' ? 'Staff' : filter === 'support' ? 'Support' : 'Inventory'}</button>)}</div></div><div className="flex flex-wrap gap-2 text-sm">{(['all','today','7d','30d'] as const).map(range => <button type="button" key={range} className={auditRange===range ? 'btn-primary px-3 py-2 text-xs' : 'btn-secondary px-3 py-2 text-xs'} onClick={()=>setAuditRange(range)}>{range === 'all' ? 'All time' : range === 'today' ? 'Today' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}</button>)}</div></div>{auditSummary && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
  {label:'Total actions', value:auditSummary.total},
  {label:'Visible', value:auditSummary.visible},
  {label:'Today', value:auditSummary.today},
  {label:'Stock updates', value:auditSummary.inventory},
].map(item => <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/40 p-3"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{item.label}</p><p className="mt-2 text-2xl font-bold text-white">{item.value}</p></div>)} </div>}<div className="flex flex-wrap gap-2 text-xs text-slate-300">{[
  {label:'Storefront', value:auditSummary?.storefront ?? 0},
  {label:'Reports', value:auditSummary?.reports ?? 0},
  {label:'Staff', value:auditSummary?.staff ?? 0},
  {label:'Support', value:auditSummary?.support ?? 0},
].map(item => <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/40 px-2.5 py-1.5"><span className="h-2 w-2 rounded-full bg-primary" />{item.label}: <strong>{item.value}</strong></span>)}</div></div>}
 {message&&<p role="status" className="rounded-xl border border-primary p-4">{message}</p>}{busy&&<p role="status">Loading…</p>}
 {draft&&<form onSubmit={save} className="card-premium p-6 grid gap-4">
 {kind==='inventory'&&<><label>Product<select className="admin-input w-full" value={draft.product_id} onChange={e=>setDraft({...draft,product_id:e.target.value})}>{menuItems.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{field('change','Quantity change (use a negative number to reduce)','number')}{field('warning_level','Low-stock warning level','number')}{field('reason','Reason')}</>}
 {kind==='delivery'&&<><div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-4 text-sm text-white/80"><b className="block text-orange-100">One-time rider setup</b><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Ask the rider to sign in at <strong>/delivery-partner</strong>.</li><li>Copy the email shown on that rider page.</li><li>Paste the same email below and save.</li></ol></div>{field('name','Rider name')}{field('phone','Rider phone','tel')}{field('email','Rider Google login email','email')}<label><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/> Rider is active</label></>}
 {kind==='support'&&<>{field('customer_phone','Customer phone','tel')}{field('subject','Subject')}{field('notes','Internal notes')}<label>Status<select className="admin-input" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}>{['open','in_progress','resolved'].map(s=><option key={s}>{s}</option>)}</select></label></>}
 {kind==='staff'&&<>{field('user_id','Authentication user ID')}<label>Role<select className="admin-input" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value,permissions:Object.fromEntries(roleDefaults[e.target.value].map(s=>[s,['view','create','edit']]))})}>{Object.keys(roleDefaults).map(s=><option key={s}>{s}</option>)}</select></label><label><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/> Active staff member</label><div className="overflow-x-auto"><table><thead><tr><th>Section</th>{['view','create','edit','delete','export','manage'].map(a=><th className="p-2" key={a}>{a}</th>)}</tr></thead><tbody>{permissionSections.map(s=><tr key={s}><th>{s}</th>{['view','create','edit','delete','export','manage'].map(a=><td className="p-2" key={a}><input aria-label={s+' '+a} type="checkbox" checked={(draft.permissions[s]||[]).includes(a)} onChange={e=>setDraft({...draft,permissions:{...draft.permissions,[s]:e.target.checked?[...(draft.permissions[s]||[]),a]:(draft.permissions[s]||[]).filter((x:string)=>x!==a)}})}/></td>)}</tr>)}</tbody></table></div></>}
 <div className="flex gap-3"><button className="btn-primary" disabled={busy}>Save</button><button type="button" className="btn-secondary" onClick={()=>setDraft(null)}>Cancel</button></div></form>}
 <div className="grid gap-3">{!busy&&!auditRows.length&&<p>No records found.</p>}{(kind === 'audit' ? auditRows : rows).map((row,index)=><article className="card-premium p-5 space-y-3" key={row.id||row.product_id||row.user_id||index}>
 {kind==='inventory'?<><h2 className="font-bold">{menuItems.find(p=>p.id===row.product_id)?.name||row.product_id}</h2><p>{row.quantity} available · Warning at {row.warning_level} {row.quantity===0?'· OUT OF STOCK':row.quantity<=row.warning_level?'· LOW STOCK':''}</p><button className="btn-secondary" onClick={()=>setDraft({...row,change:0,reason:''})}>Adjust</button> <button onClick={()=>void showHistory(row.product_id)}>Stock history</button></>:kind==='notifications'?<><h2>{row.message}</h2><p>{new Date(row.created_at).toLocaleString()}</p><button disabled={read.includes(row.id)} onClick={async()=>{const r=await supabase.from('notification_reads').insert({notification_id:row.id});if(r.error)setMessage(r.error.message);else void refresh()}}>{read.includes(row.id)?'Read':'Mark as read'}</button></>:kind==='audit'?<><div className="space-y-2"><div className="flex items-center gap-2 flex-wrap"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${badgeColor(row.action)}`}>{formatActionLabel(row.action)}</span><span className="text-xs opacity-60">{new Date(row.created_at).toLocaleString()}</span></div><p className="text-sm opacity-80">{row.actor ? `Updated by ${row.actor}` : 'System activity'}</p><p className="text-sm text-white/80">{summarizeAudit(row.details)}</p>{row.record_id && <p className="text-xs opacity-70 break-all">Reference: {row.record_id}</p>}</div></>:<><h2 className="font-bold">{row.name||row.subject||row.user_id}</h2><p>{row.phone||row.customer_phone||row.role} · {row.status||(row.active?'Active':'Disabled')}</p>{row.notes&&<p>{row.notes}</p>}<button className="btn-secondary" onClick={()=>setDraft(row)}>Edit</button></>}
 </article>)}</div><div className="flex gap-4 items-center"><button disabled={page===0||busy} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1} · {count} records</span><button disabled={(page+1)*25>=count||busy} onClick={()=>setPage(p=>p+1)}>Next</button></div>
 {!!history.length&&<section className="card-premium p-5"><h2>Latest stock adjustments</h2><button onClick={()=>setHistory([])}>Close history</button>{history.map(h=><p key={h.id}>{new Date(h.created_at).toLocaleString()} · {h.change>0?'+':''}{h.change} → {h.quantity_after} · {h.reason} · {h.actor||'System'}</p>)}</section>}
 </section>
}
