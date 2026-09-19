import OrderAlerts from '../components/OrderAlerts'
import { useState, useEffect } from 'react'
import { calculateDistance } from '../lib/mapUtils'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { supabase } from '../lib/supabase'
import AdminOrderDetails from '../components/AdminOrderDetails'
import OrderCancellationDialog from '../components/OrderCancellationDialog'
import DeliveryHistoryPanel from '../components/DeliveryHistoryPanel'
import DeliveryAuditBrowser from '../components/DeliveryAuditBrowser'
import ForceDeliverDialog from '../components/ForceDeliverDialog'
const nextStatus = (order: any) => ({ placed: 'confirmed', ORDER_PLACED: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: order.meta.orderType === 'pickup' ? 'picked_up' : 'out_for_delivery', out_for_delivery: 'delivered' } as Record<string,string>)[order.status]
const label = (status: string) => ({
  placed: 'Order received',
  ORDER_PLACED: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Cooking',
  ready: 'Ready for rider pickup',
  out_for_delivery: 'Delivery boy picked up · On the way to customer',
  delivered: 'Delivered',
  picked_up: 'Picked up',
  awaiting_payment: 'Awaiting payment',
  cancelled: 'Cancelled',
} as Record<string, string>)[String(status || '')] || status.split('_').join(' ')
const actionLabel = (status: string, orderType: string) => ({
  placed: 'Confirm order',
  confirmed: 'Start cooking',
  preparing: 'Mark ready',
  ready: orderType === 'pickup' ? 'Mark picked up' : 'Delivery boy picked up',
  out_for_delivery: 'Delivery on the way to customer',
  delivered: 'Completed',
  picked_up: 'Completed',
} as Record<string, string>)[String(status || '')] || label(status)
const statusTone = (status: string) => {
  const normalized = String(status || '').toLowerCase()
  if (['out_for_delivery', 'ready', 'confirmed', 'preparing'].includes(normalized)) return 'border-orange-400/35 bg-orange-500/10 text-orange-100'
  if (['delivered', 'picked_up'].includes(normalized)) return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100'
  if (normalized === 'cancelled') return 'border-red-400/35 bg-red-500/10 text-red-100'
  if (normalized === 'awaiting_payment') return 'border-amber-400/35 bg-amber-500/10 text-amber-100'
  return 'border-slate-400/25 bg-slate-500/10 text-slate-100'
}
export default function AdminOrdersManagement() {
  const { orders, error, loading, refresh } = useAdminOrders()
  const [filter, setFilter] = useState('active')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [cancelOrder, setCancelOrder] = useState<any>(null)
  const [forceOrder, setForceOrder] = useState<{ id: string; orderNumber: string } | null>(null)
  const [showAudit, setShowAudit] = useState(false)
  const [auditOrder, setAuditOrder] = useState<string | undefined>(undefined)

  const resolveCustomerLocation = (order: any) => {
    const candidate = order?.customerLocation ?? order?.customer
    if (candidate && typeof candidate.lat === 'number' && Number.isFinite(candidate.lat) && typeof candidate.lng === 'number' && Number.isFinite(candidate.lng)) {
      return { lat: candidate.lat, lng: candidate.lng }
    }
    return null
  }

  function OrderEta({ orderNumber, customer }: { orderNumber: string; customer?: any }) {
    const [loc, setLoc] = useState<{ latitude: number; longitude: number } | null>(null)
    const [eta, setEta] = useState<string | null>(null)
    useEffect(() => {
      let active = true
      const fetchLatest = async () => {
        try {
          const { data } = await supabase.from('delivery_tracking').select('latitude,longitude,updated_at').eq('order_number', orderNumber).order('updated_at', { ascending: false }).limit(1)
          if (!active) return
          if (data && data.length) setLoc({ latitude: data[0].latitude, longitude: data[0].longitude })
        } catch (e) {}
      }
      void fetchLatest()
      let channel: any = null
      try {
        channel = supabase.channel(`delivery_tracking_admin_${orderNumber}`)
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_tracking', filter: `order_number=eq.${orderNumber}` }, (payload: any) => {
          const rec = payload.new || payload.record || payload
          if (rec && typeof rec.latitude === 'number' && typeof rec.longitude === 'number') setLoc({ latitude: rec.latitude, longitude: rec.longitude })
        }).subscribe()
      } catch (e) {}
      return () => { active = false; try { if (channel) supabase.removeChannel(channel) } catch (e) {} }
    }, [orderNumber])

    useEffect(() => {
      if (!loc || !customer || typeof customer.lat !== 'number' || typeof customer.lng !== 'number') { setEta(null); return }
      const dist = calculateDistance(loc.latitude, loc.longitude, customer.lat, customer.lng)
      const speedMs = (15 * 1000) / 3600
      const seconds = dist / speedMs
      const mins = Math.max(0, Math.round(seconds / 60))
      setEta(`${mins} min`)
    }, [loc, customer])

    return <div className="text-sm text-accent/60">ETA: {eta ?? '––'}</div>
  }

  async function update(id: string, status: string, reason?: string, orderNumber?: string) {
    setBusy(id)
    setMessage('')
    try {
      const result = await supabase.rpc('set_order_status', { p_id: id, p_status: status, p_reason: reason || null })
      if (result.error) throw new Error(result.error.message)
      await refresh()
      if (status !== 'out_for_delivery' || !orderNumber) {
        setMessage("Order status updated. The customer's tracking page will refresh automatically.")
        return
      }
      // If marking out_for_delivery, no push needed. If marking delivered/picked_up elsewhere, trigger push.
      if (['delivered', 'picked_up'].includes(status) && orderNumber) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token
          await fetch('/.netlify/functions/push-trigger', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ order_id: orderNumber, title: 'Order update', message: `Your order ${orderNumber} is now ${status}.` }) })
        } catch (e) {
          // ignore push errors
        }
      }
      setMessage('The rider must start delivery from their own Delivery Partner portal. Admin GPS is never used.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update order.')
    } finally {
      setBusy('')
    }
  }

  const filtered = orders.filter(row => (
    (filter === 'all' || filter === 'pending' ? filter === 'all' || row.payload.status === 'awaiting_payment' : !['cancelled', 'delivered', 'picked_up', 'awaiting_payment'].includes(row.payload.status))
    && (row.order_number + ' ' + row.payload.customer?.name + ' ' + row.payload.customer?.phone).toLowerCase().includes(query.toLowerCase())
  ))
  const summary = [
    { label: 'Active orders', value: orders.filter(row => !['cancelled', 'delivered', 'picked_up', 'awaiting_payment'].includes(row.payload.status)).length },
    { label: 'Awaiting payment', value: orders.filter(row => row.payload.status === 'awaiting_payment').length },
    { label: 'Completed', value: orders.filter(row => ['delivered', 'picked_up'].includes(row.payload.status)).length },
    { label: 'Total orders', value: orders.length },
  ]

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header className="card-premium overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">Restaurant operations</p>
            <h1 className="section-title mt-2">Dispatch board</h1>
            <p className="mt-2 text-sm text-white/65">Track live kitchen progress, rider handoff, and customer-ready orders in one place.</p>
          </div>
          <button className="btn-secondary" onClick={() => void refresh()}>Refresh board</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(item => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </header>
      <OrderAlerts orders={orders} loading={loading} />

      <div className="flex flex-wrap gap-3">
        <input className="admin-input flex-1" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search orders" placeholder="Search order, name, or phone" />
        <select className="admin-input" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter orders">
          <option value="active">Active orders</option>
          <option value="pending">Awaiting online payment</option>
          <option value="all">All orders</option>
        </select>
        <button className="btn-secondary" onClick={() => void refresh()}>Refresh</button>
        <button className="btn-secondary" onClick={() => { setAuditOrder(undefined); setShowAudit(prev => !prev) }}>{showAudit ? 'Hide audit' : 'Open audit'}</button>
      </div>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {loading && <p>Loading orders…</p>}
      {!loading && !filtered.length && <p>No matching orders.</p>}

      {filtered.map(row => {
        const order = row.payload
        const next = nextStatus(order)
        return (
          <article className="card-premium p-5 space-y-4" key={row.id}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-[-0.03em] text-white">{order.customer?.name || 'Guest'}</h2>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusTone(order.status)}`}>
                    {label(order.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm break-all text-white/60">{row.order_number}</p>
              </div>

              <div className="xl:text-right">
                <p className="text-2xl font-black text-white">₹{Number(order.total).toFixed(2)}</p>
                <p className="mt-1 text-sm text-white/60">{order.meta.orderType === 'delivery' ? 'Delivery' : 'Pickup'} · {order.meta.payment === 'online' ? 'Online payment' : 'Cash payment'}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-white/45">{order.payment_status || 'pending'}</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/25 p-4 md:grid-cols-2">
              <div className="space-y-2 text-sm text-white/80">
                <p><span className="font-semibold text-white/60">Phone:</span> <a href={'tel:' + order.customer?.phone} className="text-orange-200 hover:text-orange-100">{order.customer?.phone}</a></p>
                {order.meta.orderType === 'delivery' && <p><span className="font-semibold text-white/60">Address:</span> {order.customer?.address || 'Not provided'}</p>}
                {order.customer?.landmark && <p><span className="font-semibold text-white/60">Landmark:</span> {order.customer.landmark}</p>}
              </div>
              <div className="space-y-2 text-sm text-white/80">
                {order.customer?.instructions && <p className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-2 text-orange-100"><span className="font-semibold">Instructions:</span> {order.customer.instructions}</p>}
                <p><span className="font-semibold text-white/60">Items:</span> {order.items.length}</p>
                <p><span className="font-semibold text-white/60">Payment:</span> {order.meta.payment === 'online' ? 'Online' : 'Cash'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Order items</p>
              <ul className="space-y-2 text-sm text-white/80">
                {order.items.map((item: any, index: number) => (
                  <li key={index} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <span className="flex-1">
                      <span className="font-medium text-white">{item.quantity} × {item.name}</span>
                      {item.selectedAddons?.length ? <span className="block text-white/55">{item.selectedAddons.map((a: any) => a.name).join(', ')}</span> : null}
                    </span>
                    <span className="font-semibold text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="btn-secondary w-full sm:w-auto" onClick={async () => {
                try {
                  const text = prompt('Push message to send', `Test notification for ${row.order_number}`)
                  if (!text) return
                  const { data: { session } } = await supabase.auth.getSession()
                  const token = session?.access_token
                  await fetch('/.netlify/functions/push-trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ action: 'send', order_id: row.order_number, title: 'Test notification', message: text })
                  })
                  // simple UX feedback
                  // eslint-disable-next-line no-alert
                  alert('Push requested')
                } catch (e) {
                  // eslint-disable-next-line no-alert
                  alert('Failed to request push')
                }
              }}>Send push</button>
              <button className="btn-secondary w-full sm:w-auto" onClick={async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  const token = session?.access_token
                  const res = await fetch('/.netlify/functions/push-trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ action: 'list', order_id: row.order_number })
                  })
                  const text = await res.text()
                  if (res.ok) {
                    const parsed = JSON.parse(text)
                    // eslint-disable-next-line no-alert
                    alert(`Subscriptions for ${row.order_number}: ${parsed.count}`)
                  } else {
                    // eslint-disable-next-line no-alert
                    alert('Failed to fetch subscriptions')
                  }
                } catch (e) {
                  // eslint-disable-next-line no-alert
                  alert('Failed to fetch subscriptions')
                }
              }}>View subscriptions</button>
              {next && !(order.meta.orderType === 'delivery' && ['out_for_delivery', 'delivered'].includes(next)) && <button className="btn-primary w-full sm:w-auto" disabled={busy === row.id} onClick={() => void update(row.id, next, undefined, row.order_number)}>{actionLabel(next, order.meta.orderType)}</button>}
              {order.status === 'out_for_delivery' && (
                <button
                  className="btn-secondary w-full sm:w-auto border border-red-400/40 text-red-200 hover:bg-red-500/10"
                  disabled={busy === row.id}
                  onClick={() => setForceOrder({ id: row.id, orderNumber: row.order_number })}
                >Force mark delivered</button>
              )}
              {!['delivered', 'picked_up', 'cancelled'].includes(order.status) && <button className="btn-secondary w-full sm:w-auto border border-red-400/40 text-red-200 hover:bg-red-500/10" disabled={busy === row.id} onClick={() => setCancelOrder(row)}>Cancel order</button>}
              <button className="btn-secondary w-full sm:w-auto" onClick={() => { setAuditOrder(row.order_number); setShowAudit(true) }}>View activity</button>
            </div>

            {order.meta.orderType === 'delivery' && ['ready', 'out_for_delivery'].includes(order.status) && (
              <section className="rounded-2xl border border-orange-400/25 bg-gradient-to-br from-[#201913] via-[#171311] to-[#0f0d0b] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">Rider dispatch</p><h3 className="mt-1 text-xl font-black text-white">{order.status === 'ready' ? 'Waiting for rider collection' : 'Rider is on the way'}</h3></div><span className={order.status === 'out_for_delivery' ? 'rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200' : 'rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-200'}>{order.status === 'out_for_delivery' ? 'LIVE' : 'READY'}</span></div>
                    <p className="mt-4 text-sm leading-6 text-white/75">{order.status === 'ready' ? 'Assign a rider in Details, notes & delivery. The rider receives this job in their own portal and starts it from their phone.' : 'The rider’s own phone provides the live location. The customer tracking link updates automatically.'}</p>
                    {order.status === 'out_for_delivery' && <div className="mt-3"><OrderEta orderNumber={row.order_number} customer={resolveCustomerLocation(order)} /></div>}
                {order.status === 'out_for_delivery' && <div className="mt-4"><DeliveryHistoryPanel orderNumber={row.order_number} customerLocation={resolveCustomerLocation(order)} /></div>}
              </section>
            )}

            {order.status === 'cancelled' && order.payment_status === 'paid' && <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-100">Captured payment: review and issue any refund in the payment provider dashboard.</p>}

            <AdminOrderDetails row={row} />
          </article>
        )
      })}

      {cancelOrder && <OrderCancellationDialog orderNumber={cancelOrder.order_number} total={Number(cancelOrder.payload.total)} paid={cancelOrder.payload.payment_status === 'paid'} onClose={() => setCancelOrder(null)} onConfirm={reason => { void update(cancelOrder.id, 'cancelled', reason); setCancelOrder(null) }} />}
      {showAudit && <DeliveryAuditBrowser defaultOrder={auditOrder} />}
      {forceOrder && (
        <ForceDeliverDialog
          orderNumber={forceOrder.orderNumber}
          onClose={() => setForceOrder(null)}
          onConfirm={async (reason) => { setForceOrder(null); await update(forceOrder.id, 'delivered', reason, forceOrder.orderNumber) }}
        />
      )}
    </div>
  )
}
