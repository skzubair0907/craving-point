import { useState } from 'react'
import { MapPin, Phone, Truck, PackageCheck } from 'lucide-react'
import { useAdminOrders } from '../hooks/useAdminOrders'
import { supabase } from '../lib/supabase'
import AdminOrderDetails from '../components/AdminOrderDetails'
import DeliveryLocationControls from '../components/DeliveryLocationControls'
import DeliveryHistoryPanel from '../components/DeliveryHistoryPanel'
import DeliveryMetricsPanel from '../components/DeliveryMetricsPanel'
import AdminOperations from './AdminOperations'
import OrderAlerts from '../components/OrderAlerts'

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

    const deliveries = orders.filter(r => r.payload.meta?.orderType === 'delivery')
    const matches = (status: string, stage: string) => stage === 'preparing' ? ['placed', 'confirmed', 'preparing'].includes(status) : status === stage
    const visible = deliveries.filter(r => matches(r.payload.status, tab) && [r.order_number, r.payload.customer?.name, r.payload.customer?.phone, r.payload.customer?.address].join(' ').toLowerCase().includes(query.toLowerCase()))

    async function advance(row: any, status: string) {
        setBusy(row.id); setMessage('')
        try {
            const { error } = await supabase.rpc('set_order_status', { p_id: row.id, p_status: status, p_reason: null })
            if (error) throw error
            await refresh()

            if (status !== 'out_for_delivery') {
                setMessage('Delivery status updated. Customer tracking will update automatically.')
                return
            }

            if (!navigator.geolocation) {
                setMessage('Order dispatched. Open the On the way order on the rider phone to share live location.')
                return
            }

            setMessage('Order dispatched. Allow location permission to share the rider position.')
            navigator.geolocation.getCurrentPosition(async position => {
                try {
                    const result = await supabase.rpc('set_delivery_location', { p_order_number: row.order_number, p_latitude: position.coords.latitude, p_longitude: position.coords.longitude, p_accuracy: position.coords.accuracy })
                    if (result.error) throw result.error
                    setMessage('Order dispatched and rider location shared. The customer map updates within 15 seconds.')
                } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Order dispatched, but rider location could not be saved.')
                }
            }, () => setMessage('Order dispatched. Location permission was denied; share it from the On the way order.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })

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
                            <article key={row.id} className="card-premium p-5 space-y-4">
                                <div className="flex flex-wrap justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-bold">{o.customer?.name || 'Guest'}</h2>
                                        <p className="text-xs break-all text-accent/60">{row.order_number}</p>
                                    </div>
                                    <span className="text-primary font-bold capitalize">{o.status.split('_').join(' ')}</span>
                                </div>

                                <p className="flex gap-2"><MapPin size={18} className="shrink-0 mt-1" />{o.customer?.address || 'Address unavailable'}</p>
                                {o.customer?.landmark && <p>Landmark: {o.customer.landmark}</p>}
                                {o.customer?.instructions && <p>Instructions: {o.customer.instructions}</p>}

                                <p>{o.items.map((i: any) => i.quantity + ' x ' + i.name).join(', ')}</p>

                                <div className="flex flex-wrap justify-between gap-3 text-sm">
                                    <span>{o.payment_status === 'paid' ? 'Paid' : o.payment_status === 'refunded' ? 'Refunded' : o.meta.payment === 'cod' ? 'Cash to collect' : 'Payment pending'}: {'\u20b9'}{Number(o.total).toFixed(2)}</span>
                                    <time>{new Date(row.created_at).toLocaleString()}</time>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <a className="btn-secondary flex items-center gap-2" href={'tel:' + o.customer?.phone}><Phone size={16} />Call customer</a>
                                    {o.customer?.address && <a className="btn-secondary" href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.customer.address)} target="_blank" rel="noreferrer">Open address in Maps</a>}
                                    {next && <button className="btn-primary flex items-center gap-2" disabled={busy === row.id} onClick={() => void advance(row, next)}><Truck size={16} />{next === 'out_for_delivery' ? 'Dispatch order' : next === 'delivered' ? 'Mark delivered' : 'Mark ' + next}</button>}
                                </div>

                                {o.status === 'out_for_delivery' && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <DeliveryLocationControls orderId={row.id} orderNumber={row.order_number} onMessage={setMessage} />
                                        <DeliveryHistoryPanel orderNumber={row.order_number} />
                                    </div>
                                )}

                                <AdminOrderDetails row={row} />
                            </article>
                        )
                    })}
                    {showAudit && (
                        <div>
                            <DeliveryAuditBrowser />
                        </div>
                    )}
                        {showMetrics && (
                            <div className="mt-4">
                                <DeliveryMetricsPanel />
                            </div>
                        )}
                </>
            )}
        </div>
    )
}
}
