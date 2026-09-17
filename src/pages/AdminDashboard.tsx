import OrderControls from '../components/OrderControls'
import OrderAlerts from '../components/OrderAlerts'
import { Link } from 'react-router-dom'
import { useAdminOrders } from '../hooks/useAdminOrders'
export default function AdminDashboard() {
  const { orders, error, loading, refresh } = useAdminOrders()
  const active = orders.filter(r => !['cancelled','delivered','picked_up','awaiting_payment'].includes(r.payload.status))
  const completed = orders.filter(r => ['delivered','picked_up'].includes(r.payload.status))
  const revenue = orders.filter(r => r.payload.payment_status === 'paid' && r.payload.status !== 'cancelled').reduce((sum,r)=>sum+Number(r.payload.total),0)
  const stats = [
    { label: 'Orders received', value: String(orders.length), sub: 'All orders in view', tone: 'from-orange-500/20 to-orange-400/5' },
    { label: 'Active orders', value: String(active.length), sub: 'Need attention now', tone: 'from-amber-500/20 to-yellow-400/5' },
    { label: 'Completed', value: String(completed.length), sub: 'Closed successfully', tone: 'from-emerald-500/20 to-green-400/5' },
    { label: 'Captured payments', value: '₹' + revenue.toFixed(2), sub: 'Paid online orders', tone: 'from-sky-500/20 to-cyan-400/5' },
  ]
  const pulse = [
    { label: 'Service health', value: active.length ? 'Watching live queue' : 'Stable', tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' },
    { label: 'Avg. ticket value', value: orders.length ? '₹' + (revenue / Math.max(orders.length, 1)).toFixed(2) : '₹0.00', tone: 'border-sky-400/30 bg-sky-500/10 text-sky-200' },
    { label: 'Operational status', value: 'Open for service', tone: 'border-amber-400/30 bg-amber-500/10 text-amber-200' },
  ]

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="card-premium overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="eyebrow">Restaurant operations</p>
              <h1 className="section-title mt-2">Business overview</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live
              </span>
              <button className="btn-secondary" onClick={() => void refresh()}>Refresh</button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {pulse.map((item) => (
              <span key={item.label} className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${item.tone}`}>
                {item.label}: <strong className="ml-2 text-[11px] normal-case tracking-[0.02em] text-white">{item.value}</strong>
              </span>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.tone} p-4`}>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">{stat.label}</p>
                <p className="mt-3 text-3xl font-black text-white">{stat.value}</p>
                <p className="mt-2 text-sm text-white/60">{stat.sub}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <OrderControls />
            <OrderAlerts orders={orders} loading={loading} />
          </div>

          <aside className="card-premium p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">Needs attention</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">{active.length} open</span>
            </div>

            <div className="space-y-3">
              {!active.length && <p className="text-sm text-white/70">No active orders right now.</p>}
              {active.slice(0, 6).map((row) => (
                <Link
                  to="/admin/orders"
                  key={row.id}
                  className="block rounded-2xl border border-white/8 bg-white/3 p-3 transition hover:border-primary/40 hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{row.payload.customer?.name || 'Guest'}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-primary">{String(row.payload.status).split('_').join(' ')}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm text-white/70">
                    <span>{row.payload.items?.length || 0} items</span>
                    <span className="font-semibold text-white">₹{Number(row.payload.total).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <div className="card-premium p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Service snapshot</h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live
            </span>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Based on your latest 1,000 saved orders. Refreshes every 15 seconds. Cash collections are not included in captured payments.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Opened</p>
              <p className="mt-2 text-xl font-bold text-white">{active.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Completed</p>
              <p className="mt-2 text-xl font-bold text-white">{completed.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Captured</p>
              <p className="mt-2 text-xl font-bold text-white">₹{revenue.toFixed(2)}</p>
            </div>
          </div>
          {error && <p role="alert" className="mt-4">{error}</p>}
          {loading && <p role="status" className="mt-4">Loading orders…</p>}
        </div>
      </div>
    </div>
  )
}
