import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateDistance, isValidLocation, resolveMapCenter } from '../lib/mapUtils'
import { getRouteGeoJSON } from '../lib/directions'

export interface DeliveryMapProps {
  customerLocation: { lat: number; lng: number }
  riderLocation?: { lat: number; lng: number } | null
  height?: string | number
  width?: string | number
}

const customerPin = L.divIcon({ className: 'delivery-map-pin', html: '<span class="delivery-map-pin__label delivery-map-pin__label--customer" aria-label="Customer delivery location">C</span>', iconSize: [36, 36], iconAnchor: [18, 18] })
const riderPin = L.icon({ iconUrl: '/images/delivery-boy-marker.svg', iconSize: [52, 52], iconAnchor: [26, 46], popupAnchor: [0, -44] })

export const DeliveryMap = ({ customerLocation, riderLocation = null, height = '400px', width = '100%' }: DeliveryMapProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
  const riderMarkerRef = useRef<L.Marker | null>(null)
  const riderPolylineRef = useRef<L.Polyline | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)
  const [ready, setReady] = useState(false)
  const customer = isValidLocation(customerLocation)
    ? customerLocation
    : resolveMapCenter({ customerLocation, riderLocation, fallbackLocation: { lat: 19.0175, lng: 72.8905 } })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map)
    mapRef.current = map
    layersRef.current = L.layerGroup().addTo(map)
    setReady(true)
    return () => { map.remove(); mapRef.current = null; layersRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!ready || !map || !layers) return

    // customer marker
    layers.clearLayers()
    const customerPoint: L.LatLngExpression = [customer.lat, customer.lng]
    L.marker(customerPoint, { icon: customerPin, title: 'Customer delivery location', keyboard: true }).bindPopup('Customer delivery location').addTo(layers)

    // handle rider marker and animation
    if (riderLocation && isValidLocation(riderLocation)) {
      const riderLatLng = L.latLng(riderLocation.lat, riderLocation.lng)

      // create marker if needed
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.marker(riderLatLng, { icon: riderPin, title: 'Delivery rider live location' }).addTo(map)
      }

      // create or update accuracy circle
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(riderLatLng, { radius: riderLocation['accuracy'] || 20, color: '#ef3f25', opacity: 0.2, fillOpacity: 0.05 }).addTo(map)
      } else {
        accuracyCircleRef.current.setLatLng(riderLatLng)
        if (typeof riderLocation['accuracy'] === 'number') accuracyCircleRef.current.setRadius(riderLocation['accuracy'])
      }

      // animate marker smoothly from previous to new position
      const marker = riderMarkerRef.current
      const from = marker.getLatLng()
      const to = riderLatLng
      const duration = 800
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const lat = from.lat + (to.lat - from.lat) * t
        const lng = from.lng + (to.lng - from.lng) * t
        marker.setLatLng([lat, lng])
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)

      // update or create polyline to customer (prefer routed polyline)
      const routeKey = `${to.lat.toFixed(5)}:${to.lng.toFixed(5)}|${customer.lat.toFixed(5)}:${customer.lng.toFixed(5)}`
      const lastRouteKey = (riderPolylineRef as any).__routeKey
      if (routeKey !== lastRouteKey) {
        ;(riderPolylineRef as any).__routeKey = routeKey
        // fetch route in background
        void (async () => {
          const json = await getRouteGeoJSON({ lat: to.lat, lng: to.lng }, { lat: customer.lat, lng: customer.lng })
          if (json && Array.isArray(json.routes) && json.routes[0] && json.routes[0].geometry && json.routes[0].geometry.coordinates) {
            const coords: L.LatLngExpression[] = (json.routes[0].geometry.coordinates as Array<[number, number]>).map(([lng, lat]) => [lat, lng])
            if (!riderPolylineRef.current) riderPolylineRef.current = L.polyline(coords, { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(map)
            else riderPolylineRef.current.setLatLngs(coords)
            ;(riderPolylineRef as any).__wasRouted = true
            return
          }
          // fallback: straight polyline
          const pts = [to, L.latLng(customer.lat, customer.lng)]
          if (!riderPolylineRef.current) riderPolylineRef.current = L.polyline(pts, { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(map)
          else riderPolylineRef.current.setLatLngs(pts)
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
      else map.fitBounds(L.latLngBounds([to, customerPoint]), { padding: [48, 48], maxZoom: 16 })
    } else {
      // no rider - reset view
      if (riderMarkerRef.current) { riderMarkerRef.current.remove(); riderMarkerRef.current = null }
      if (riderPolylineRef.current) { riderPolylineRef.current.remove(); riderPolylineRef.current = null }
      if (accuracyCircleRef.current) { accuracyCircleRef.current.remove(); accuracyCircleRef.current = null }
      map.setView(customerPoint, 16)
    }
  }, [ready, customer.lat, customer.lng, riderLocation?.lat, riderLocation?.lng])

  return <div className="delivery-map-surface" ref={containerRef} style={{ width, height }} />
}

export default DeliveryMap
