import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DeliveryMetricsPanel() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [staleMinutes, setStaleMinutes] = useState(10)
  const [accuracyMeters, setAccuracyMeters] = useState(200)

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('delivery_tracking_metrics').select('*').order('last_write', { ascending: false }).limit(1000)
      if (error) throw error
      setMetrics(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function refreshNow() {
    setLoading(true)
    try {
      const { error } = await supabase.rpc('refresh_delivery_tracking_metrics', { p_minutes: 60 })
      if (error) throw error
      await load()
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  function exportCsv() {
    const rows = [['Order', 'Last Write', 'Writes', 'Avg accuracy (m)', 'Min (m)', 'Max (m)', 'Window (min)']]
    metrics.forEach(m => rows.push([m.order_number || '', m.last_write ? new Date(m.last_write).toLocaleString() : '', String(m.writes_count || ''), String(m.avg_accuracy || ''), String(m.min_accuracy || ''), String(m.max_accuracy || ''), String(m.window_minutes || '')]))
    const blob = new Blob(['\uFEFF' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'delivery-metrics.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const now = Date.now()
  const filtered = metrics.filter(m => {
    if (!m.last_write) return true
    const minutes = (now - new Date(m.last_write).getTime()) / 60000
    if (minutes > staleMinutes) return true
    if ((m.avg_accuracy || 0) > accuracyMeters) return true
    return true
  })

  return (
    <div className="card-premium p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Delivery tracking metrics</h3>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => void load()} disabled={loading}>Refresh list</button>
          <button className="btn-primary" onClick={() => void refreshNow()} disabled={loading}>Refresh metrics (run aggregation)</button>
          <button className="btn-secondary" onClick={exportCsv}>Export CSV</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-sm">Stale threshold (minutes)
          <input className="admin-input" type="number" value={staleMinutes} onChange={e => setStaleMinutes(Number(e.target.value || 0))} />
        </label>
        <label className="text-sm">Accuracy threshold (meters)
          <input className="admin-input" type="number" value={accuracyMeters} onChange={e => setAccuracyMeters(Number(e.target.value || 0))} />
        </label>
      </div>

      {loading && <p>Loading metrics...</p>}

      {!loading && !metrics.length && <p>No metrics available. Run aggregation to populate.</p>}

      {metrics.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Order</th>
              <th className="text-left">Last write</th>
              <th className="text-right">Writes</th>
              <th className="text-right">Avg (m)</th>
              <th className="text-right">Min</th>
              <th className="text-right">Max</th>
              <th className="text-right">Window</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.order_number} className="border-t">
                <td className="py-2">{m.order_number}</td>
                <td className="py-2">{m.last_write ? new Date(m.last_write).toLocaleString() : '—'}</td>
                <td className="py-2 text-right">{m.writes_count}</td>
                <td className="py-2 text-right">{m.avg_accuracy?.toFixed ? m.avg_accuracy.toFixed(1) : m.avg_accuracy}</td>
                <td className="py-2 text-right">{m.min_accuracy}</td>
                <td className="py-2 text-right">{m.max_accuracy}</td>
                <td className="py-2 text-right">{m.window_minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
