import { useState, useEffect } from 'react'
import { MapPin, Phone, Truck, PackageCheck } from 'lucide-react'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { supabase } from '../lib/supabase'
import { calculateDistance } from '../lib/mapUtils'
import AdminOrderDetails from '../components/AdminOrderDetails'
import DeliveryHistoryPanel from '../components/DeliveryHistoryPanel'
import DeliveryAuditBrowser from '../components/DeliveryAuditBrowser'
import DeliveryMetricsPanel from '../components/DeliveryMetricsPanel'
import AdminOperations from './AdminOperations'
import OrderAlerts from '../components/OrderAlerts'
import ForceDeliverDialog from '../components/ForceDeliverDialog'
import PushSendLogs from '../components/PushSendLogs'

const stages = [['preparing', 'In kitchen'], ['ready', 'Ready to dispatch'], ['out_for_delivery', 'On the way'], ['delivered', 'Delivered']]

export default function AdminDispatch() {
    const { orders, loading, error, refresh } = useAdminOrders()
    const [tab, setTab] = useState('ready')
    const [query, setQuery] = useState('')
    const [busy, setBusy] = useState('')
    const [message, setMessage] = useState('')
    const [team, setTeam] = useState(false)
    const [showAudit, setShowAudit] = useState(false)
    const [showMetrics, setShowMetrics] = useState(false)
    const [showPushLogs, setShowPushLogs] = useState(false)
    const [showEtaTester, setShowEtaTester] = useState(false)
    const [etaResult, setEtaResult] = useState<any | null>(null)
    const [etaLoading, setEtaLoading] = useState(false)

    const deliveries = orders.filter(r => r.payload.meta?.orderType === 'delivery')
    const matches = (status: string, stage: string) => stage === 'preparing' ? ['placed', 'confirmed', 'preparing'].includes(status) : status === stage
    const visible = deliveries.filter(r => matches(r.payload.status, tab) && [r.order_number, r.payload.customer?.name, r.payload.customer?.phone, r.payload.customer?.address].join(' ').toLowerCase().includes(query.toLowerCase()))

    const [forceOrder, setForceOrder] = useState<{ id: string; orderNumber: string } | null>(null)
    const [hoveredOrder, setHoveredOrder] = useState<string | null>(null)
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
    const [panelCollapsed, setPanelCollapsed] = useState(false)

    // persist selected order and panel state across reloads
    useEffect(() => {
        try {
            const saved = localStorage.getItem('admin:selectedOrder')
            const collapsed = localStorage.getItem('admin:panelCollapsed')
            if (saved) setSelectedOrder(saved)
            if (collapsed === '1') setPanelCollapsed(true)
        } catch (e) {}
    }, [])
    useEffect(() => {
        try {
            if (selectedOrder) localStorage.setItem('admin:selectedOrder', selectedOrder)
            else localStorage.removeItem('admin:selectedOrder')
        } catch (e) {}
    }, [selectedOrder])
    useEffect(() => {
        try { localStorage.setItem('admin:panelCollapsed', panelCollapsed ? '1' : '0') } catch (e) {}
    }, [panelCollapsed])

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
                    if (data && data.length) {
                        const d = data[0] as any
                        setLoc({ latitude: d.latitude, longitude: d.longitude })
                    }
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

        // get server ETA using Mapbox via our route-eta function
        useEffect(() => {
            let mounted = true
            if (!loc || !customer || typeof customer.lat !== 'number' || typeof customer.lng !== 'number') { setEta(null); return }
            void (async () => {
                try {
                    const res = await fetch('/.netlify/functions/route-eta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin: { lat: loc.latitude, lng: loc.longitude }, dest: { lat: customer.lat, lng: customer.lng }, ttlSeconds: 300 }) })
                    if (!res.ok) throw new Error('ETA fetch failed')
                    const j = await res.json()
                    if (!mounted) return
                    if (typeof j.duration_seconds === 'number') setEta(`${Math.max(0, Math.round(j.duration_seconds / 60))} min`)
                    else setEta(null)
                } catch (e) {
                    // fallback to distance-based estimate
                    const dist = calculateDistance(loc.latitude, loc.longitude, customer.lat, customer.lng)
                    const speedMs = (15 * 1000) / 3600
                    const seconds = dist / speedMs
                    const mins = Math.max(0, Math.round(seconds / 60))
                    if (mounted) setEta(`${mins} min`)
                }
            })()
            return () => { mounted = false }
        }, [loc, customer])

        return <span className="text-sm text-accent/60">ETA: {eta ?? '––'}</span>
    }

    async function advance(row: any, status: string, reason?: string | null) {
        setBusy(row.id); setMessage('')
        try {
            const { error } = await supabase.rpc('set_order_status', { p_id: row.id, p_status: status, p_reason: reason ?? null })
            if (error) throw error
            await refresh()
            await refresh()

            // If status is delivered or picked_up, trigger a push notification for the order
            if (['delivered', 'picked_up'].includes(status) && row.order_number) {
                try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const token = session?.access_token
                    await fetch('/.netlify/functions/push-trigger', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ order_id: row.order_number, title: 'Order update', message: `Your order ${row.order_number} is now ${status}.` }) })
                } catch (e) { /* ignore push errors */ }
            }

            if (status !== 'out_for_delivery') {
                setMessage('Delivery status updated. Customer tracking will update automatically.')
                return
            }

            setMessage('Order dispatched. The assigned rider now starts live location from their own Delivery Partner portal.')

        } catch (error) {
            setMessage(error instanceof Error ? error.message : (error as { message?: string })?.message || 'Unable to update delivery.')
        } finally { setBusy('') }
    }

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <header className="flex flex-wrap justify-between gap-4">
                <div>
                    <p className="text-sm text-accent/60">RESTAURANT OPERATIONS</p>
                    <h1 className="section-title">Delivery dispatch</h1>
                </div>
                    <div className="flex items-center gap-2">
                    <button className="btn-secondary" onClick={() => setTeam(!team)}>{team ? 'Back to dispatch' : 'Manage delivery team'}</button>
                    <button className="btn-secondary" onClick={() => setShowAudit(prev => !prev)}>{showAudit ? 'Hide audit browser' : 'Open audit browser'}</button>
                    <button className="btn-secondary" onClick={() => setShowMetrics(prev => !prev)}>{showMetrics ? 'Hide metrics' : 'Open metrics'}</button>
                    <button className="btn-secondary" onClick={() => setShowPushLogs(p => !p)}>{showPushLogs ? 'Hide push logs' : 'View push logs'}</button>
                    <button className="btn-secondary" onClick={() => setShowEtaTester(p => !p)}>{showEtaTester ? 'Hide ETA tester' : 'Test ETA'}</button>
                </div>
            </header>

            {team ? <AdminOperations kind="delivery" /> : (
                <>
                    <p className="text-sm text-accent/60">Assign riders from order details and keep customers updated. Latest 1,000 orders; automatically refreshed.</p>
                    <OrderAlerts orders={orders} loading={loading} />

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {stages.map(([value, label]) => (
                            <button key={value} className={'card-premium p-4 text-left border ' + (tab === value ? 'border-primary' : 'border-white/10')} aria-pressed={tab === value} onClick={() => setTab(value)}>
                                <span className="block text-sm">{label}</span>
                                <strong className="block text-3xl mt-2">{deliveries.filter(r => matches(r.payload.status, value)).length}</strong>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <input className="admin-input flex-1 min-w-0" aria-label="Search deliveries" placeholder="Name, order, phone or address" value={query} onChange={e => setQuery(e.target.value)} />
                        <button className="btn-secondary" onClick={() => void refresh()}>Refresh</button>
                    </div>

                    {error && <p role="alert">{error}</p>}
                    {message && <p role="status">{message}</p>}
                    {loading && <p>Loading deliveries...</p>}

                    {!loading && !visible.length && (
                        <div className="card-premium p-8 text-center">
                            <PackageCheck className="mx-auto mb-3" />
                            <p>No deliveries in this stage.</p>
                        </div>
                    )}

                    {visible.map(row => {
                        const o = row.payload
                        const next = ({ placed: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'out_for_delivery', out_for_delivery: 'delivered' } as Record<string, string>)[o.status]
                        return (
                            <article key={row.id} className="card-premium p-5 space-y-4" onMouseEnter={() => setHoveredOrder(row.order_number)} onMouseLeave={() => setHoveredOrder(null)}>
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold">{o.customer?.name || 'Guest'}</h2>
                                        <p className="text-xs break-all text-accent/60">{row.order_number}</p>
                                    </div>
                                    <span className="text-primary font-bold capitalize">{o.status.split('_').join(' ')}</span>
                                    <div className="mt-1">
                                        <OrderEta orderNumber={row.order_number} customer={resolveCustomerLocation(o)} />
                                    </div>
                                </div>

                                <p className="flex gap-2"><MapPin size={18} className="shrink-0 mt-1" />{o.customer?.address || 'Address unavailable'}</p>
                                {o.customer?.landmark && <p>Landmark: {o.customer.landmark}</p>}
                                {o.customer?.instructions && <p>Instructions: {o.customer.instructions}</p>}

                                <p>{o.items.map((i: any) => i.quantity + ' x ' + i.name).join(', ')}</p>

                                <div className="flex flex-wrap justify-between gap-3 text-sm">
                                    <span>{o.payment_status === 'paid' ? 'Paid' : o.payment_status === 'refunded' ? 'Refunded' : o.meta.payment === 'cod' ? 'Cash to collect' : 'Payment pending'}: {'\u20b9'}{Number(o.total).toFixed(2)}</span>
                                    <time>{new Date(row.created_at).toLocaleString()}</time>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-3">
                                    <a className="btn-secondary flex items-center gap-2" href={'tel:' + o.customer?.phone}><Phone size={16} />Call customer</a>
                                    {o.customer?.address && <a className="btn-secondary" href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.customer.address)} target="_blank" rel="noreferrer">Open address in Maps</a>}
                                    <button className="btn-secondary" onClick={() => setSelectedOrder(row.order_number)}><MapPin size={14} /> Open map</button>
                                    {next && next !== 'out_for_delivery' && next !== 'delivered' && <button className="btn-primary flex items-center gap-2" disabled={busy === row.id} onClick={() => void advance(row, next)}><Truck size={16} />Mark {next}</button>}
                                    {o.status === 'out_for_delivery' && (
                                        <button
                                            className="btn-secondary border border-red-400/40 text-red-200 hover:bg-red-500/10"
                                            disabled={busy === row.id}
                                            onClick={() => setForceOrder({ id: row.id, orderNumber: row.order_number })}
                                        >Force mark delivered</button>
                                    )}
                                    {o.status === 'ready' && <span className="rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm text-primary">The assigned rider starts delivery from their own phone.</span>}
                                </div>

                                {o.status === 'out_for_delivery' && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <DeliveryHistoryPanel orderNumber={row.order_number} customerLocation={resolveCustomerLocation(o)} />
                                    </div>
                                )}

                                <AdminOrderDetails row={row} />
                            </article>
                        )
                    })}
                    {hoveredOrder && (
                        <div className="hidden xl:block fixed right-8 top-24 z-40 w-96">
                            <DeliveryHistoryPanel orderNumber={hoveredOrder} customerLocation={resolveCustomerLocation(visible.find(r => r.order_number === hoveredOrder)?.payload)} />
                        </div>
                    )}
                    {selectedOrder && (
                        <div className={`fixed right-6 top-20 z-50 ${panelCollapsed ? 'w-24' : 'w-1/3 max-w-xl'}`}>
                            <div className={`rounded-2xl border border-white/10 bg-[#0b0b0b] ${panelCollapsed ? 'p-2' : 'p-3'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <strong className="truncate">Order {selectedOrder}</strong>
                                    <div className="flex items-center gap-2">
                                        <button className="btn-secondary" onClick={() => setPanelCollapsed(p => !p)}>{panelCollapsed ? 'Expand' : 'Collapse'}</button>
                                        <button className="btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
                                    </div>
                                </div>
                                {!panelCollapsed ? (
                                    <DeliveryHistoryPanel orderNumber={selectedOrder} customerLocation={resolveCustomerLocation(visible.find(r => r.order_number === selectedOrder)?.payload)} />
                                ) : (
                                    <div className="text-sm text-accent/60">Collapsed view. Click Expand to view map.</div>
                                )}
                            </div>
                        </div>
                    )}
                    {showAudit && (
                        <div>
                            <DeliveryAuditBrowser />
                        </div>
                    )}
                    {showPushLogs && (
                        <div className="mt-4">
                            <PushSendLogs />
                        </div>
                    )}
                    {showEtaTester && (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 max-w-xl">
                            <h3 className="font-bold">ETA tester</h3>
                            <p className="text-sm text-accent/60">Enter origin and destination coordinates to call the server ETA.</p>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <input placeholder="Origin lat" className="admin-input" id="eta-origin-lat" />
                                <input placeholder="Origin lng" className="admin-input" id="eta-origin-lng" />
                                <input placeholder="Dest lat" className="admin-input" id="eta-dest-lat" />
                                <input placeholder="Dest lng" className="admin-input" id="eta-dest-lng" />
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <button className="btn-primary" onClick={async ()=>{
                                    const olat = (document.getElementById('eta-origin-lat') as HTMLInputElement).value
                                    const olng = (document.getElementById('eta-origin-lng') as HTMLInputElement).value
                                    const dlat = (document.getElementById('eta-dest-lat') as HTMLInputElement).value
                                    const dlng = (document.getElementById('eta-dest-lng') as HTMLInputElement).value
                                    setEtaResult(null)
                                    setEtaLoading(true)
                                    try{
                                        const res = await fetch('/.netlify/functions/route-eta', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ origin: { lat: Number(olat), lng: Number(olng) }, dest: { lat: Number(dlat), lng: Number(dlng) } }) })
                                        const j = await res.json()
                                        setEtaResult(j)
                                    }catch(e){ setEtaResult({ error: String(e) }) }
                                    finally { setEtaLoading(false) }
                                }}>{etaLoading ? 'Calling…' : 'Call ETA'}</button>
                                <button className="btn-secondary" onClick={()=>{ (document.getElementById('eta-origin-lat') as HTMLInputElement).value=''; (document.getElementById('eta-origin-lng') as HTMLInputElement).value=''; (document.getElementById('eta-dest-lat') as HTMLInputElement).value=''; (document.getElementById('eta-dest-lng') as HTMLInputElement).value=''; setEtaResult(null); }}>Clear</button>
                            </div>
                            {etaResult && (
                                <div className="mt-3">
                                    <h4 className="font-medium">Result</h4>
                                    <pre className="mt-2 overflow-auto max-h-48 p-3 bg-black/20 rounded text-xs whitespace-pre-wrap">{JSON.stringify(etaResult, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    )}
                        {showMetrics && (
                            <div className="mt-4">
                                <DeliveryMetricsPanel />
                            </div>
                        )}
                        {forceOrder && (
                            <ForceDeliverDialog
                                orderNumber={forceOrder.orderNumber}
                                onClose={() => setForceOrder(null)}
                                onConfirm={async (reason) => {
                                    const fakeRow = { id: forceOrder.id }
                                    setForceOrder(null)
                                    await advance(fakeRow, 'delivered', reason)
                                }}
                            />
                        )}
                </>
            )}
        </div>
    )
}
