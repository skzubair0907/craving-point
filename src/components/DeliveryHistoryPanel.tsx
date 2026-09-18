import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { DeliveryMap } from './DeliveryMap2'

export default function DeliveryHistoryPanel({ orderNumber, customerLocation }: { orderNumber: string, customerLocation?: { lat?: number; lng?: number } | null }) {
  const [rows, setRows] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAudit, setUseAudit] = useState(false)

  const latestRow = rows[0]
  const recentRows = rows.slice(0, 4)
  const latestMapUrl = latestRow && Number.isFinite(Number(latestRow.latitude)) && Number.isFinite(Number(latestRow.longitude))
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${Number(latestRow.latitude)},${Number(latestRow.longitude)}`)}&z=15&output=embed`
    : null

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!orderNumber || !supabase) return
      setLoading(true)
      setError(null)
      try {
        const table = useAudit ? 'delivery_tracking_audit' : 'delivery_tracking'
        const res = await supabase
          .from(table)
          .select('latitude,longitude,accuracy,updated_at')
          .eq('order_number', orderNumber)
          .order('updated_at', { ascending: false })
          .limit(50)
        if (!mounted) return
        if (res.error) throw res.error
        const nextRows = res.data || []
        setRows(nextRows)
      } catch (e: any) {
        setError(e?.message || 'Unable to load delivery history')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 5000)
    return () => { mounted = false; clearInterval(timer) }
  }, [orderNumber, useAudit])

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1b1a1b] via-[#17171a] to-[#0d0d0f] p-4 shadow-[0_20px_42px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">Dispatch</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-white">Customer live map</h3>
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-2.5 py-1.5 text-xs text-white/75">
          <input type="checkbox" checked={useAudit} onChange={e=>setUseAudit(e.target.checked)} aria-label="Show audit history" />
          Full log
        </label>
      </div>

      {loading && <p className="mt-3 text-sm text-white/70">Loading live location…</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {!loading && rows.length === 0 && <p className="mt-3 text-sm text-white/60">Waiting for rider location.</p>}

      {latestRow && (
        <div className="mt-4 space-y-3">
              {customerLocation && latestRow ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40" style={{ height: 220 }}>
                  <DeliveryMap
                    customerLocation={{ lat: Number(customerLocation.lat || 0), lng: Number(customerLocation.lng || 0) }}
                    riderLocation={Number(latestRow.latitude) && Number(latestRow.longitude) ? { lat: Number(latestRow.latitude), lng: Number(latestRow.longitude) } : null}
                    height={220}
                  />
                </div>
              ) : latestMapUrl ? (
                <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/40" style={{ height: 220 }}>
                  <iframe
                    title={`Delivery rider location for ${orderNumber}`}
                    src={latestMapUrl}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', border: 0 }}
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-900/40 text-sm text-white/60">
                  Waiting for location data
                </div>
              )}

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-sm text-white/80">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-emerald-100">Rider status</span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                Live
              </span>
            </div>
            <div className="mt-2 text-white/70">{new Date(latestRow.updated_at).toLocaleString()}</div>
            <div className="mt-2 text-white/80">
              {Number.isFinite(Number(latestRow.latitude)) && Number.isFinite(Number(latestRow.longitude))
                ? `Lat ${Number(latestRow.latitude).toFixed(6)} · Lng ${Number(latestRow.longitude).toFixed(6)}`
                : 'Location not available'}
            </div>
            {latestRow.accuracy != null && <div className="text-white/60">Accuracy: {latestRow.accuracy} m</div>}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/45 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Recent updates</div>
            <ul className="space-y-2 text-sm">
              {recentRows.map((r: any, idx: number) => (
                <li key={idx} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="font-mono text-[11px] text-orange-200/80">{new Date(r.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-white/70">{r.accuracy != null ? `${r.accuracy} m accuracy` : 'Location shared'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

// Leaflet map initialization: keep out-of-band to avoid blocking initial render.
export async function initDeliveryHistoryMap(containerId: string, points: Array<any>) {
  if (typeof window === 'undefined') return
  if (!containerId || !points || points.length === 0) return
  const el = document.getElementById(containerId)
  if (!el) return

  // Ensure CSS
  const cssId = 'leaflet-css'
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link')
    link.id = cssId
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }

  try {
    const L = await import('leaflet')
    // Cleanup existing children
    el.innerHTML = ''
    const lat = Number(points[0].latitude)
    const lng = Number(points[0].longitude)
    const map = (L as any).map(el, { center: [lat, lng], zoom: 13, zoomControl: true })
    ;(L as any).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map)

    const pin = (color: string, label: string, markerText: string, isSvg = false) => {
      if (isSvg) {
        // Inline SVG scooter icon (red with white details) sized 44x44
        const svg = encodeURIComponent(`
          <svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'>
            <defs>
              <filter id='s' x='-50%' y='-50%' width='200%' height='200%'>
                <feDropShadow dx='0' dy='2' stdDeviation='2' flood-opacity='0.6' />
              </filter>
            </defs>
            <g filter='url(#s)'>
              <circle cx='22' cy='22' r='20' fill='#ef4444' />
              <path d='M12 28c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm20 0c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='#fff' opacity='0.95' />
              <path d='M14 19c3-3 8-3 11-1 2 1.5 3 4 5 5l2-1c-2-3-1-6-4-8-3-2-8-1-11 2-1 1-3 1-3 1v1z' fill='#fff' opacity='0.95'/>
              <text x='22' y='33' font-size='7' text-anchor='middle' fill='#fff' font-family='Arial' font-weight='700'>CP</text>
            </g>
          </svg>
        `)
        const html = `<div aria-label="${label}" style="width:44px;height:44px;display:block;background:url('data:image/svg+xml;utf8,${svg}') center/contain no-repeat"></div>`
        return (L as any).divIcon({ className: '', html, iconSize: [44, 44], iconAnchor: [22, 22] })
      }
      return (L as any).divIcon({ className: '', html: `<span aria-label="${label}" style="display:grid;place-items:center;width:28px;height:28px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 2px 8px #0008;color:white;font:700 12px/12px system-ui">${markerText}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] })
    }

    const latlngs: [number, number][] = []
    points.slice().reverse().forEach((p: any, i: number) => {
      const la = Number(p.latitude)
      const lo = Number(p.longitude)
      latlngs.push([la, lo])
      const isLast = i === points.length - 1
      if (isLast) {
        // compute bearing from the previous point (if available) so marker faces direction
        let rotation = 0
        if (latlngs.length >= 2) {
          const a = latlngs[latlngs.length - 2]
          const b = latlngs[latlngs.length - 1]
          const toRad = (d: number) => d * Math.PI / 180
          const toDeg = (r: number) => r * 180 / Math.PI
          const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]))
          const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]))
          rotation = (toDeg(Math.atan2(y, x)) + 360) % 360
        }

        const html = `<div style="width:44px;height:44px;display:block;transform:rotate(${rotation}deg);background:radial-gradient(circle at 50% 35%, #fff4b0 0%, #fbbf24 25%, #ef4444 70%);border-radius:50%;border:2px solid rgba(255,255,255,0.9);box-shadow:0 3px 10px rgba(0,0,0,0.25)"></div>`
        ;(L as any).marker([la, lo], { icon: (L as any).divIcon({ className: '', html, iconSize: [44, 44], iconAnchor: [22, 22] }) }).addTo(map)

        // draw accuracy circle if available
        try {
          const lastPoint = points[points.length - 1]
          if (lastPoint && lastPoint.accuracy != null) {
            ;(L as any).circle([la, lo], { radius: Number(lastPoint.accuracy || 0), color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }).addTo(map)
          }
        } catch {}
      } else {
        ;(L as any).marker([la, lo], { icon: pin('#2563eb', `Point ${i+1}`, String(points.length - i)) }).addTo(map)
      }
    })

    ;(L as any).polyline(latlngs, { color: '#ff0000', weight: 4, opacity: 0.8 }).addTo(map)
    try { map.fitBounds((L as any).latLngBounds(latlngs), { padding: [24, 24] }) } catch {}
  } catch (e) {
    // ignore map errors
  }
}
