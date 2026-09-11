import { useState } from 'react'
import { useAdminOrders } from '../hooks/useAdminOrders'
export default function AdminCustomers() {
  const { orders, error, loading } = useAdminOrders()
  const [query,setQuery] = useState('')
  const customers = new Map<string, { name: string; phone: string; count: number; spent: number }>()
  for (const row of orders) {
    if (row.payload.status === 'awaiting_payment') continue
    const customer = row.payload.customer
    if (!customer?.phone) continue
    const key=customer.phone.replace(/\D/g,'')
    const entry=customers.get(key)||{name:customer.name,phone:customer.phone,count:0,spent:0}
    entry.count++
    if(row.payload.status !== 'cancelled')entry.spent+=Number(row.payload.total)
    customers.set(key,entry)
  }
  return <div className="p-4 sm:p-8 space-y-6"><h1 className="section-title">Customers</h1><p className="text-accent/60">Customers from your latest 1,000 orders. Order value excludes cancellations.</p>{error && <p role="alert">{error}</p>}{loading && <p role="status">Loading customers…</p>}<input className="admin-input w-full" placeholder="Search name or phone" aria-label="Search customers" value={query} onChange={e=>setQuery(e.target.value)}/><div className="card-premium overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Customer','Phone','Orders','Order value'].map(label=><th className="p-4" key={label}>{label}</th>)}</tr></thead><tbody>{[...customers.values()].filter(c=>(c.name+' '+c.phone).toLowerCase().includes(query.toLowerCase())).map(c=><tr key={c.phone} className="border-t border-[var(--brand-border)]"><td className="p-4">{c.name}</td><td className="p-4"><a href={'tel:'+c.phone}>{c.phone}</a></td><td className="p-4">{c.count}</td><td className="p-4">₹{c.spent.toFixed(2)}</td></tr>)}</tbody></table>{!customers.size && <p className="p-6">Customers appear here after orders are received.</p>}</div></div>
}
