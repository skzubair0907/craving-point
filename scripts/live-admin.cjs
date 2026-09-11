const fs=require('fs');
fs.writeFileSync('src/pages/AdminDashboard.tsx', `import { Link } from 'react-router-dom'
import { useAdminOrders } from '../hooks/useAdminOrders'
export default function AdminDashboard() {
  const { orders, error, loading, refresh } = useAdminOrders()
  const active = orders.filter(r => !['cancelled','delivered','picked_up','awaiting_payment'].includes(r.payload.status))
  const completed = orders.filter(r => ['delivered','picked_up'].includes(r.payload.status))
  const revenue = orders.filter(r => r.payload.payment_status === 'paid' && r.payload.status !== 'cancelled').reduce((sum,r)=>sum+Number(r.payload.total),0)
  const stats = [['Orders received', orders.length],['Active orders',active.length],['Completed orders',completed.length],['Online payments captured','₹'+revenue.toFixed(2)]]
  return <div className="p-4 sm:p-8 space-y-7"><div className="flex flex-wrap justify-between gap-4"><h1 className="section-title">Business overview</h1><button className="btn-secondary" onClick={() => void refresh()}>Refresh</button></div><p className="text-accent/60">Based on your latest 1,000 saved orders. Refreshes every 15 seconds. Cash collections are not included in captured payments.</p>{error && <p role="alert">{error}</p>}{loading && <p role="status">Loading orders…</p>}<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{stats.map(([label,value])=><div className="card-premium p-6" key={label}><p className="text-accent/60">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>)}</div><div className="card-premium p-6"><h2 className="text-2xl font-bold mb-5">Orders needing attention</h2>{!active.length && <p>No active orders right now.</p>}{active.slice(0,8).map(row=><Link to="/admin/orders" key={row.id} className="flex flex-wrap justify-between gap-3 py-4 border-b border-[var(--brand-border)]"><span>{row.payload.customer?.name || 'Guest'} · {row.payload.items?.length || 0} items</span><span className="text-primary">{String(row.payload.status).replaceAll('_',' ')} · ₹{Number(row.payload.total).toFixed(2)}</span></Link>)}</div></div>
}
`);
fs.writeFileSync('src/pages/AdminCustomers.tsx', `import { useState } from 'react'
import { useAdminOrders } from '../hooks/useAdminOrders'
export default function AdminCustomers() {
  const { orders, error, loading } = useAdminOrders()
  const [query,setQuery] = useState('')
  const customers = new Map<string, { name: string; phone: string; count: number; spent: number }>()
  for (const row of orders) {
    if (row.payload.status === 'awaiting_payment') continue
    const customer = row.payload.customer
    if (!customer?.phone) continue
    const key=customer.phone.replace(/\\D/g,'')
    const entry=customers.get(key)||{name:customer.name,phone:customer.phone,count:0,spent:0}
    entry.count++
    if(row.payload.status !== 'cancelled')entry.spent+=Number(row.payload.total)
    customers.set(key,entry)
  }
  return <div className="p-4 sm:p-8 space-y-6"><h1 className="section-title">Customers</h1><p className="text-accent/60">Customers from your latest 1,000 orders. Order value excludes cancellations.</p>{error && <p role="alert">{error}</p>}{loading && <p role="status">Loading customers…</p>}<input className="admin-input w-full" placeholder="Search name or phone" aria-label="Search customers" value={query} onChange={e=>setQuery(e.target.value)}/><div className="card-premium overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Customer','Phone','Orders','Order value'].map(label=><th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody>{[...customers.values()].filter(c=>(c.name+' '+c.phone).toLowerCase().includes(query.toLowerCase())).map(c=><tr key={c.phone} className="border-t border-[var(--brand-border)]"><td className="p-4">{c.name}</td><td className="p-4"><a href={'tel:'+c.phone}>{c.phone}</a></td><td className="p-4">{c.count}</td><td className="p-4">₹{c.spent.toFixed(2)}</td></tr>)}</tbody></table>{!customers.size && <p className="p-6">Customers appear here after orders are received.</p>}</div></div>
}
`);
fs.writeFileSync('src/pages/AdminReviews.tsx', `import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
export default function AdminReviews() {
  const [reviews,setReviews] = useState<any[]>([])
  const [error,setError] = useState('')
  const [busy,setBusy] = useState('')
  async function refresh() { const result = await supabase.from('customer_reviews').select('*').order('created_at',{ascending:false}); if(result.error)setError(result.error.message);else {setReviews(result.data || []);setError('')} }
  useEffect(()=>{void refresh().catch(()=>setError('Unable to load reviews.'))},[])
  return <div className="p-4 sm:p-8 space-y-6"><h1 className="section-title">Customer reviews</h1><p>Reviews come from completed orders. Approve a review to show it on the homepage.</p>{error && <p role="alert">{error}</p>}{!reviews.length && <p>No customer reviews yet.</p>}{reviews.map(review=><article className="card-premium p-6 space-y-4" key={review.id}><div className="flex justify-between gap-4"><strong>{review.name} · {review.rating}/5</strong><span>{review.approved?'Published':'Awaiting review'}</span></div><p>{review.review}</p><p className="text-sm text-accent/60 break-all">Order: {review.order_number}</p><button className="btn-secondary" disabled={busy===review.id} onClick={async()=>{setBusy(review.id);try{const result=await supabase.from('customer_reviews').update({approved:!review.approved}).eq('id',review.id);if(result.error)throw result.error;await refresh()}catch{setError('Unable to update this review.')}finally{setBusy('')}}}>{review.approved?'Unpublish':'Approve and publish'}</button></article>)}</div>
}
`);
fs.writeFileSync('src/pages/AdminOrdersManagement.tsx', `import { useState } from 'react'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { supabase } from '../lib/supabase'
const nextStatus = (order: any) => ({ placed: 'confirmed', ORDER_PLACED: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: order.meta.orderType === 'pickup' ? 'picked_up' : 'out_for_delivery', out_for_delivery: 'delivered' } as Record<string,string>)[order.status]
const label = (status: string) => status.replaceAll('_',' ')
export default function AdminOrdersManagement() {
  const { orders, error, loading, refresh } = useAdminOrders()
  const [filter,setFilter] = useState('active')
  const [busy,setBusy] = useState('')
  const [message,setMessage] = useState('')
  const [query,setQuery] = useState('')
  async function update(id:string,status:string) {setBusy(id);setMessage('');try{const result=await supabase.rpc('set_order_status',{p_id:id,p_status:status});if(result.error)throw new Error(result.error.message);await refresh();setMessage('Order status updated. The customer’s tracking page will refresh automatically.')}catch(error){setMessage(error instanceof Error?error.message:'Unable to update order.')}finally{setBusy('')}}
  const filtered=orders.filter(row=>(filter==='all'||filter==='pending'?filter==='all'||row.payload.status==='awaiting_payment':!['cancelled','delivered','picked_up','awaiting_payment'].includes(row.payload.status)) && (row.order_number+' '+row.payload.customer?.name+' '+row.payload.customer?.phone).toLowerCase().includes(query.toLowerCase()))
  return <div className="p-4 sm:p-8 space-y-6"><h1 className="section-title">Orders</h1><div className="flex flex-wrap gap-3"><input className="admin-input flex-1" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search orders" placeholder="Search order, name, or phone"/><select className="admin-input" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter orders"><option value="active">Active orders</option><option value="pending">Awaiting online payment</option><option value="all">All orders</option></select><button className="btn-secondary" onClick={()=>void refresh()}>Refresh</button></div>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{loading && <p>Loading orders…</p>}{!loading && !filtered.length && <p>No matching orders.</p>}{filtered.map(row=>{const order=row.payload;const next=nextStatus(order);return <article className="card-premium p-5 space-y-4" key={row.id}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-xl">{order.customer?.name || 'Guest'}</h2><p className="text-sm break-all text-accent/60">{row.order_number}</p></div><div><p className="font-bold text-primary capitalize">{label(order.status)}</p><p>₹{Number(order.total).toFixed(2)} · {order.meta.orderType}</p><p className="text-sm">{order.meta.payment==='online'?'Online':'Cash'} · {order.payment_status || 'pending'}</p></div></div><p><a href={'tel:'+order.customer?.phone}>{order.customer?.phone}</a>{order.meta.orderType==='delivery'?' · '+order.customer?.address:''}</p>{order.customer?.landmark&&<p>Landmark: {order.customer.landmark}</p>}{order.customer?.instructions&&<p className="text-primary">Instructions: {order.customer.instructions}</p>}<ul className="space-y-2">{order.items.map((item:any,index:number)=><li key={index}>{item.quantity} × {item.name} · ₹{(item.price*item.quantity).toFixed(2)}{item.selectedAddons?.length?' + '+item.selectedAddons.map((a:any)=>a.name).join(', '):''}</li>)}</ul><div className="flex flex-wrap gap-3">{next&&<button className="btn-primary" disabled={busy===row.id} onClick={()=>void update(row.id,next)}>Mark {label(next)}</button>}{!['delivered','picked_up','cancelled'].includes(order.status)&&<button className="btn-secondary" disabled={busy===row.id} onClick={()=>{if(window.confirm('Cancel this order? Any captured payment must be refunded from the payment provider dashboard.'))void update(row.id,'cancelled')}}>Cancel order</button>}</div>{order.status==='cancelled'&&order.payment_status==='paid'&&<p className="text-primary">Captured payment: review and issue any refund in the payment provider dashboard.</p>}</article>})}</div>
}
`);
