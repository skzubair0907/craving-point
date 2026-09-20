import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateDistance, isValidLocation, resolveMapCenter, calculateBearing } from '../lib/mapUtils'
import { getRouteGeoJSON } from '../lib/directions'

export interface DeliveryMapProps {
  customerLocation: { lat: number; lng: number }
  riderLocation?: { lat: number; lng: number; accuracy?: number; timestamp?: string; riderId?: string } | null
  height?: string | number
  width?: string | number
}

const customerPin = L.divIcon({ className: 'delivery-map-pin', html: '<span class="delivery-map-pin__label delivery-map-pin__label--customer" aria-label="Customer delivery location">C</span>', iconSize: [36, 36], iconAnchor: [18, 18] })
const riderPin = L.icon({ iconUrl: '/images/delivery-boy-marker.svg', iconSize: [52, 52], iconAnchor: [26, 46], popupAnchor: [0, -44] })

function riderDivIcon(rotation = 0) {
  const html = `<div style="width:52px;height:52px;display:block;transform:rotate(${rotation}deg)"><img src='/images/delivery-boy-marker.svg' style='width:52px;height:52px;display:block' alt='rider' /></div>`
  return L.divIcon({ className: '', html, iconSize: [52, 52], iconAnchor: [26, 46] })
}

export const DeliveryMap = ({ customerLocation, riderLocation = null, height = '400px', width = '100%' }: DeliveryMapProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
  const riderMarkerRef = useRef<L.Marker | null>(null)
  const riderPolylineRef = useRef<L.Polyline | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const lastAnimTargetRef = useRef<string | null>(null)
  const positionsRef = useRef<Array<{lat:number,lng:number,ts:number,accuracy?:number}>>([])
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [routeRetry, setRouteRetry] = useState(0)
  const customer = isValidLocation(customerLocation)
    ? customerLocation
    : resolveMapCenter({ customerLocation, riderLocation, fallbackLocation: { lat: 19.0175, lng: 72.8905 } })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const container = containerRef.current
    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: false,
      preferCanvas: true,
      attributionControl: true,
    })

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    layersRef.current = L.layerGroup().addTo(map)

    const refreshMapSize = () => {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize()
          if (!map.getCenter() || Number.isNaN(map.getCenter().lat)) {
            map.setView([customer.lat, customer.lng], 15)
          }
        } catch (error) {
          console.warn('DeliveryMap resize failed', error)
        }
      })
    }

    refreshMapSize()

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => refreshMapSize())
      observer.observe(container)
    }

    // Re-check sizing when the map is re-shown or if a parent layout changes.
    const timer = window.setTimeout(refreshMapSize, 120)

    setReady(true)

    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
      tileLayer.remove()
      map.remove()
      mapRef.current = null
      layersRef.current = null
    }
  }, [customer.lat, customer.lng])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!ready || !map || !layers) return
    try {
    // when map is in a container that may have been hidden, ensure correct sizing
    setTimeout(() => { try { map.invalidateSize() } catch (e) {} }, 50)

    // customer marker
    layers.clearLayers()
    const customerPoint: L.LatLngExpression = [customer.lat, customer.lng]
    L.marker(customerPoint, { icon: customerPin, title: 'Customer delivery location', keyboard: true }).bindPopup('Customer delivery location').addTo(layers)

    // handle rider marker and animation (with smoothing buffer)
    if (riderLocation && isValidLocation(riderLocation)) {
      // maintain a small recent buffer of samples to smooth jitter
      try {
        const nowTs = Date.now()
        const buf = (positionsRef.current = positionsRef.current || [])
        buf.push({ lat: riderLocation.lat, lng: riderLocation.lng, ts: nowTs, accuracy: riderLocation.accuracy })
        const maxSamples = 5
        if (buf.length > maxSamples) buf.splice(0, buf.length - maxSamples)
      } catch (e) {}

      // compute weighted-smoothed target (recent samples weighted higher)
      const buf = positionsRef.current || []
      let riderLat = riderLocation.lat
      let riderLng = riderLocation.lng
      if (buf.length) {
        let wsum = 0
        let latSum = 0
        let lngSum = 0
        for (let i = 0; i < buf.length; i++) {
          // newer samples towards the end should get higher weight
          const weight = Math.pow(0.6, buf.length - 1 - i)
          latSum += buf[i].lat * weight
          lngSum += buf[i].lng * weight
          wsum += weight
        }
        if (wsum > 0) {
          riderLat = latSum / wsum
          riderLng = lngSum / wsum
        }
      }
      const riderLatLng = L.latLng(riderLat, riderLng)

      // create marker if needed
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.marker(riderLatLng, { icon: riderPin, title: 'Delivery rider live location' }).addTo(map)
      }

      // create or update accuracy circle using latest sample accuracy if available
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(riderLatLng, { radius: riderLocation['accuracy'] || 20, color: '#ef3f25', opacity: 0.2, fillOpacity: 0.05 }).addTo(map)
      } else {
        try { accuracyCircleRef.current.setLatLng(riderLatLng) } catch (e) {}
        const latestAcc = positionsRef.current && positionsRef.current.length ? positionsRef.current[positionsRef.current.length - 1].accuracy : riderLocation['accuracy']
        if (typeof latestAcc === 'number') try { accuracyCircleRef.current.setRadius(latestAcc) } catch (e) {}
      }

      // animate marker smoothly from previous to new (smoothed) position, cancel previous animation
      const marker = riderMarkerRef.current
      try {
        if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
        const from = marker.getLatLng()
        const toLat = riderLatLng.lat
        const toLng = riderLatLng.lng
        const targetKey = `${toLat.toFixed(6)}:${toLng.toFixed(6)}`
        if (lastAnimTargetRef.current === targetKey) {
          marker.setLatLng(riderLatLng)
        } else {
          lastAnimTargetRef.current = targetKey
          const distanceMeters = calculateDistance(from.lat, from.lng, toLat, toLng)
          if (distanceMeters < 1) {
            marker.setLatLng(riderLatLng)
          } else {
            try {
              const bearing = calculateBearing(from.lat, from.lng, toLat, toLng)
              marker.setIcon(riderDivIcon(bearing))
            } catch {}
            const duration = Math.min(1600, Math.max(250, Math.round(distanceMeters * 4)))
            const start = performance.now()
            const easeInOut = (t:number) => t<0.5 ? 2*t*t : -1 + (4 - 2*t)*t
            const step = (now: number) => {
              const raw = Math.min(1, (now - start) / duration)
              const t = easeInOut(raw)
              const lat = from.lat + (toLat - from.lat) * t
              const lng = from.lng + (toLng - from.lng) * t
              try { marker.setLatLng([lat, lng]) } catch (e) {}
              if (raw < 1) animFrameRef.current = requestAnimationFrame(step)
              else animFrameRef.current = null
            }
            animFrameRef.current = requestAnimationFrame(step)
          }
        }
      } catch (e) {
        try { marker.setLatLng(riderLatLng) } catch (e) {}
      }

      // update or create polyline to customer (prefer routed polyline)
      const to = riderLatLng
      const routeKey = `${to.lat.toFixed(5)}:${to.lng.toFixed(5)}|${customer.lat.toFixed(5)}:${customer.lng.toFixed(5)}`
      const lastRouteKey = (riderPolylineRef as any).__routeKey
      if (routeKey !== lastRouteKey) {
        ;(riderPolylineRef as any).__routeKey = routeKey
        // fetch route in background
        void (async () => {
          try {
            const json = await getRouteGeoJSON({ lat: to.lat, lng: to.lng }, { lat: customer.lat, lng: customer.lng })
            if (json && Array.isArray(json.routes) && json.routes[0] && json.routes[0].geometry && json.routes[0].geometry.coordinates) {
              const coords: L.LatLngExpression[] = (json.routes[0].geometry.coordinates as Array<[number, number]>).map(([lng, lat]) => [lat, lng])
              if (!riderPolylineRef.current) riderPolylineRef.current = L.polyline(coords, { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(map)
              else riderPolylineRef.current.setLatLngs(coords)
              ;(riderPolylineRef as any).__wasRouted = true
              // Mapbox returns duration in seconds
              if (typeof json.routes[0].duration === 'number') setEtaSeconds(Math.round(json.routes[0].duration))
              // clear any previous route error and retries
              setLastError(null)
              setRouteRetry(0)
              return
            }
            // fallback: straight polyline
            const pts = [to, L.latLng(customer.lat, customer.lng)]
            if (!riderPolylineRef.current) riderPolylineRef.current = L.polyline(pts, { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(map)
            else riderPolylineRef.current.setLatLngs(pts)
            // fallback ETA estimate: assume average speed 8 m/s (≈28.8 km/h)
            const fallbackDistance = calculateDistance(to.lat, to.lng, customer.lat, customer.lng)
            setEtaSeconds(Math.max(5, Math.round(fallbackDistance / 8)))
            // mark error and schedule retry
            setLastError('Routing geometry unavailable — will retry')
            setTimeout(() => setRouteRetry(r => r + 1), 15000)
          } catch (err) {
            try { console.error('getRouteGeoJSON failed', err); setLastError(String(err || 'route error')) } catch (e) {}
            const pts = [to, L.latLng(customer.lat, customer.lng)]
            if (!riderPolylineRef.current) riderPolylineRef.current = L.polyline(pts, { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(map)
            else riderPolylineRef.current.setLatLngs(pts)
            // schedule retry if route fetch thrown
            setTimeout(() => setRouteRetry(r => r + 1), 15000)
          }
        })()
      } else {
        // already have requested this route - just update straight line if no routed shape yet
        if (!(riderPolylineRef as any).__wasRouted) {
          const pts = [to, L.latLng(customer.lat, customer.lng)]
            if (!riderPolylineRef.current) riderPolylineRef.current = L.polyline(pts, { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(map)
            else riderPolylineRef.current.setLatLngs(pts)
        }
      }

      const distance = calculateDistance(to.lat, to.lng, customer.lat, customer.lng)
      if (distance <= 30) map.setView([customer.lat, customer.lng], 17)
      else try { map.fitBounds(L.latLngBounds([to, customerPoint]), { padding: [48, 48], maxZoom: 16 }) } catch (e) {}
    } else {
      // no rider - reset view
      if (riderMarkerRef.current) { riderMarkerRef.current.remove(); riderMarkerRef.current = null }
      if (riderPolylineRef.current) { riderPolylineRef.current.remove(); riderPolylineRef.current = null }
      if (accuracyCircleRef.current) { accuracyCircleRef.current.remove(); accuracyCircleRef.current = null }
      // clear smoothing buffer
      try { positionsRef.current = [] } catch(e){}
      try { map.setView(customerPoint, 16) } catch (e) {}
    }
    } catch (err) {
      try { console.error('DeliveryMap effect error', err); setLastError(String(err || 'map effect error')) } catch (e) {}
    }
  }, [ready, customer.lat, customer.lng, riderLocation?.lat, riderLocation?.lng, riderLocation?.accuracy, riderLocation?.timestamp, routeRetry])

  // recenter helper
  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    try {
      if (riderMarkerRef.current) {
        const r = riderMarkerRef.current.getLatLng()
        map.fitBounds(L.latLngBounds([r, L.latLng(customer.lat, customer.lng)]), { padding: [48, 48], maxZoom: 16 })
        return
      }
      map.setView([customer.lat, customer.lng], 16)
    } catch (e) {}
  }

  // compute stale GPS indicator
  const isStale = (() => {
    try {
      const ts = riderLocation?.timestamp || (positionsRef.current && positionsRef.current.length ? new Date(positionsRef.current[positionsRef.current.length-1].ts).toISOString() : null)
      if (!ts) return false
      const age = Date.now() - new Date(ts).getTime()
      return age > 45000
    } catch (e) { return false }
  })()

  function formatEta(seconds: number | null) {
    if (seconds === null) return null
    if (seconds < 60) return `${seconds}s`
    const mins = Math.round(seconds / 60)
    return `${mins} min`
  }

  return (
    <div className="relative" style={{ width, height }}>
      <div className="delivery-map-surface rounded-md" ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {lastError && (
        <div className="absolute right-3 bottom-3 z-50 rounded-md bg-red-700/80 px-3 py-2 text-white text-xs max-w-xs break-words">
          <div className="font-bold">Map error</div>
          <div className="mt-1">{lastError}</div>
        </div>
      )}
      {riderLocation && (
        <div className="absolute left-3 top-3 z-50 rounded-xl bg-black/60 px-3 py-2 text-white text-sm">
          <div className="font-bold">Live tracking {isStale? '· Stale' : ''}</div>
          <div className="mt-1">{(calculateDistance(riderLocation.lat, riderLocation.lng, customer.lat, customer.lng) / 1000).toFixed(2)} km</div>
          <div className="text-xs text-white/80">ETA: {formatEta(etaSeconds) ?? '––'}</div>
        </div>
      )}

      <div className="absolute right-3 top-3 z-50 flex gap-2">
        <button title="Recenter map" onClick={recenter} className="rounded-md bg-black/60 px-3 py-2 text-white text-xs">Recenter</button>
      </div>
    </div>
  )
}

export default DeliveryMap
