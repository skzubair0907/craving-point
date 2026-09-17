import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calculateDistance, isValidLocation, resolveMapCenter } from '../lib/mapUtils'

export interface DeliveryMapProps {
  customerLocation: { lat: number; lng: number }
  riderLocation?: { lat: number; lng: number } | null
  height?: string | number
  width?: string | number
}

const customerPin = L.divIcon({ className: 'delivery-map-pin', html: '<span class="delivery-map-pin__label delivery-map-pin__label--customer" aria-label="Customer delivery location">C</span>', iconSize: [36, 36], iconAnchor: [18, 18] })
const riderPin = L.divIcon({ className: 'delivery-map-pin', html: '<span class="delivery-map-pin__label delivery-map-pin__label--rider" aria-label="Delivery rider live location">D</span>', iconSize: [36, 36], iconAnchor: [18, 18] })

export const DeliveryMap = ({ customerLocation, riderLocation = null, height = '400px', width = '100%' }: DeliveryMapProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
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
    layers.clearLayers()
    const customerPoint: L.LatLngExpression = [customer.lat, customer.lng]
    L.marker(customerPoint, { icon: customerPin, title: 'Customer delivery location', keyboard: true }).bindPopup('Customer delivery location').addTo(layers)
    if (riderLocation && isValidLocation(riderLocation)) {
      const riderPoint: L.LatLngExpression = [riderLocation.lat, riderLocation.lng]
      L.marker(riderPoint, { icon: riderPin, title: 'Delivery rider live location', keyboard: true }).bindPopup('Delivery rider live location').addTo(layers)
      L.polyline([riderPoint, customerPoint], { color: '#ef3f25', weight: 4, opacity: 0.85 }).addTo(layers)
      const distance = calculateDistance(riderLocation.lat, riderLocation.lng, customer.lat, customer.lng)
      if (distance <= 30) map.setView(customerPoint, 17)
      else map.fitBounds(L.latLngBounds([riderPoint, customerPoint]), { padding: [48, 48], maxZoom: 16 })
    } else map.setView(customerPoint, 16)
  }, [ready, customer.lat, customer.lng, riderLocation?.lat, riderLocation?.lng])

  return <div className="delivery-map-surface" ref={containerRef} style={{ width, height }} />
}

export default DeliveryMap
