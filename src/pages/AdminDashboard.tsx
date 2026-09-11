import OrderControls from '../components/OrderControls'
import OrderAlerts from '../components/OrderAlerts'
import { Link } from 'react-router-dom'
import { useAdminOrders } from '../hooks/useAdminOrders'
export default function AdminDashboard() {
  const { orders, error, loading, refresh } = useAdminOrders()
  const active = orders.filter(r => !['cancelled','delivered','picked_up','awaiting_payment'].includes(r.payload.status))
  const completed = orders.filter(r => ['delivered','picked_up'].includes(r.payload.status))
  const revenue = orders.filter(r => r.payload.payment_status === 'paid' && r.payload.status !== 'cancelled').reduce((sum,r)=>sum+Number(r.payload.total),0)
  const stats = [['Orders received', orders.length],['Active orders',active.length],['Completed orders',completed.length],['Online payments captured','₹'+revenue.toFixed(2)]]
  return <div className="p-4 sm:p-8 space-y-7"><div className="flex flex-wrap justify-between gap-4"><h1 className="section-title">Business overview</h1><button className="btn-secondary" onClick={() => void refresh()}>Refresh</button></div><OrderControls/><OrderAlerts orders={orders} loading={loading}/><p className="text-accent/60">Based on your latest 1,000 saved orders. Refreshes every 15 seconds. Cash collections are not included in captured payments.</p>{error && <p role="alert">{error}</p>}{loading && <p role="status">Loading orders…</p>}<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{stats.map(([label,value])=><div className="card-premium p-6" key={label}><p className="text-accent/60">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>)}</div><div className="card-premium p-6"><h2 className="text-2xl font-bold mb-5">Orders needing attention</h2>{!active.length && <p>No active orders right now.</p>}{active.slice(0,8).map(row=><Link to="/admin/orders" key={row.id} className="flex flex-wrap justify-between gap-3 py-4 border-b border-[var(--brand-border)]"><span>{row.payload.customer?.name || 'Guest'} · {row.payload.items?.length || 0} items</span><span className="text-primary">{String(row.payload.status).split('_').join(' ')} · ₹{Number(row.payload.total).toFixed(2)}</span></Link>)}</div></div>
}
