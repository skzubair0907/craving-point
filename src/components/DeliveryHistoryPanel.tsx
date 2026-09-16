import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function DeliveryHistoryPanel({ orderNumber }: { orderNumber: string }) {
  const [rows, setRows] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useAudit, setUseAudit] = useState(false)

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
        setRows(res.data || [])
        // Initialize map with fresh rows after setting state
        try {
          void import('./DeliveryHistoryPanel').then(mod => {
            // call initDeliveryHistoryMap with element id and data
            try { mod.initDeliveryHistoryMap(`delivery-history-map-${orderNumber}`, res.data || []) } catch {}
          })
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Unable to load delivery history')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 5000)
    return () => { mounted = false; clearInterval(timer) }
  }, [orderNumber])

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="font-bold mb-2">Recent rider updates</h3>
      <div className="flex items-center gap-3 mb-2">
        <label className="text-sm">Show audit history</label>
        <input type="checkbox" checked={useAudit} onChange={e=>setUseAudit(e.target.checked)} aria-label="Show audit history" />
      </div>
      {loading && <p className="text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-accent/60">No recent updates.</p>}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div style={{ height: 200, borderRadius: 8, overflow: 'hidden' }} id={`delivery-history-map-${orderNumber}`} />
          <ul className="text-sm space-y-2 max-h-40 overflow-auto">
            {rows.map((r: any, idx: number) => (
              <li key={idx} className="flex justify-between items-start gap-3 border-b border-white/5 pb-2">
                <div>
                  <div className="font-mono text-xs text-accent/60">{new Date(r.updated_at).toLocaleString()}</div>
                  <div>Lat: {Number(r.latitude).toFixed(6)}, Lng: {Number(r.longitude).toFixed(6)}</div>
                  {r.accuracy != null && <div className="text-accent/60">Accuracy: {r.accuracy} m</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// Leaflet map initialization: keep out-of-band to avoid blocking initial render.
export async function initDeliveryHistoryMap(containerId: string, points: Array<any>) {
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

        // Try to use a public SVG image if available, falling back to the inline SVG divIcon
        const imgUrl = '/images/delivery-rider.svg'
        const imgExists = (() => {
          try {
            // image existence will be checked by creating an Image object
            const test = new Image()
            test.src = imgUrl
            // this doesn't synchronously confirm, but we'll attempt to use it; if 404, browser will show broken image
            return true
          } catch {
            return false
          }
        })()

        if (imgExists) {
          const html = `<div style="width:44px;height:44px;display:block;transform:rotate(${rotation}deg);background:url('${imgUrl}') center/contain no-repeat"></div>`
          ;(L as any).marker([la, lo], { icon: (L as any).divIcon({ className: '', html, iconSize: [44, 44], iconAnchor: [22, 22] }) }).addTo(map)
        } else {
          ;(L as any).marker([la, lo], { icon: pin('#ef4444', 'Latest rider position', '', true) }).addTo(map)
        }

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
