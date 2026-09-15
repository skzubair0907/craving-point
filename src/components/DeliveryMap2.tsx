import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsApi, initMap, addMarker, updateMarker, addPolyline, updatePolyline } from '../lib/mapUtils'

export interface DeliveryMapProps {
  restaurantLocation: { lat: number; lng: number }
  customerLocation: { lat: number; lng: number }
  riderLocation?: { lat: number; lng: number } | null
  height?: string | number
  width?: string | number
}

export const DeliveryMap = ({
  restaurantLocation,
  customerLocation,
  riderLocation = null,
  height = '400px',
  width = '100%',
}: DeliveryMapProps): JSX.Element => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const restaurantMarkerRef = useRef<google.maps.Marker | null>(null)
  const customerMarkerRef = useRef<google.maps.Marker | null>(null)
  const riderMarkerRef = useRef<google.maps.Marker | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const [apiLoaded, setApiLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    loadGoogleMapsApi()
      .then(() => {
        if (mounted) {
          setApiLoaded(true)
          setApiError(null)
        }
      })
      .catch(() => {
        if (mounted) setApiError('Google Maps API unavailable, using iframe fallback')
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!apiLoaded || !mapContainerRef.current) return
    if (!mapRef.current) {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(restaurantLocation)
      bounds.extend(customerLocation)
      const map = initMap(mapContainerRef.current, { center: bounds.getCenter(), zoom: 15 })
      mapRef.current = map
      map.fitBounds(bounds)
      restaurantMarkerRef.current = addMarker(map, restaurantLocation, { title: 'Restaurant', icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' } })
      customerMarkerRef.current = addMarker(map, customerLocation, { title: 'Customer', icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' } })
    }
    if (riderLocation) {
      if (riderMarkerRef.current) updateMarker(riderMarkerRef.current, riderLocation)
      else if (mapRef.current) riderMarkerRef.current = addMarker(mapRef.current, riderLocation, { title: 'Rider', icon: { url: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png' } })
      const path: google.maps.LatLngLiteral[] = [restaurantLocation, riderLocation, customerLocation]
      if (polylineRef.current) updatePolyline(polylineRef.current, path)
      else if (mapRef.current) polylineRef.current = addPolyline(mapRef.current, path, { strokeColor: '#FF0000', strokeOpacity: 0.8, strokeWeight: 4 })
    } else {
      if (riderMarkerRef.current) { riderMarkerRef.current.setMap(null); riderMarkerRef.current = null }
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null }
    }
  }, [apiLoaded, restaurantLocation.lat, restaurantLocation.lng, customerLocation.lat, customerLocation.lng, riderLocation?.lat, riderLocation?.lng])

  useEffect(() => () => {
    if (mapRef.current) mapRef.current = null
    if (restaurantMarkerRef.current) restaurantMarkerRef.current.setMap(null)
    if (customerMarkerRef.current) customerMarkerRef.current.setMap(null)
    if (riderMarkerRef.current) riderMarkerRef.current.setMap(null)
    if (polylineRef.current) polylineRef.current.setMap(null)
  }, [])

  // Leaflet fallback effect: run the hook unconditionally but only initialize when `apiError` is set.
  useEffect(() => {
    if (!apiError) return
    if (!leafletContainerRef.current) return
    let mounted = true

    // Ensure Leaflet CSS is present
    const cssId = 'leaflet-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    ;(async () => {
      try {
        const L = await import('leaflet')
        if (!mounted || !leafletContainerRef.current) return

        const centerLat = (restaurantLocation.lat + customerLocation.lat) / 2
        const centerLng = (restaurantLocation.lng + customerLocation.lng) / 2

        const map = (L as any).map(leafletContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 13,
          zoomControl: true,
        })

        ;(L as any).tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const pin = (color: string, label: string, markerText: string) => (L as any).divIcon({ className: '', html: `<span aria-label="${label}" style="display:grid;place-items:center;width:30px;height:30px;border:3px solid white;border-radius:50%;background:${color};box-shadow:0 2px 8px #0008;color:white;font:700 12px system-ui">${markerText}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] })
        ;(L as any).marker([restaurantLocation.lat, restaurantLocation.lng], { icon: pin('#e84a2a', 'Restaurant', 'S') }).addTo(map).bindPopup('Restaurant')
        ;(L as any).marker([customerLocation.lat, customerLocation.lng], { icon: pin('#2563eb', 'Customer', 'C') }).addTo(map).bindPopup('Customer delivery location')
        if (riderLocation) (L as any).marker([riderLocation.lat, riderLocation.lng], { icon: pin('#16a34a', 'Rider', 'D') }).addTo(map).bindPopup('Delivery rider live location')

        const path: [number, number][] = [[restaurantLocation.lat, restaurantLocation.lng]]
        if (riderLocation) path.push([riderLocation.lat, riderLocation.lng])
        path.push([customerLocation.lat, customerLocation.lng])

        ;(L as any).polyline(path, { color: '#ff0000', weight: 4, opacity: 0.8 }).addTo(map)
        map.fitBounds((L as any).latLngBounds(path), { padding: [60, 60] })

        leafletMapRef.current = map
      } catch (e) {
        // ignore
      }
    })()

    return () => {
      mounted = false
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove() } catch {}
        leafletMapRef.current = null
      }
    }
  }, [
    apiError,
    restaurantLocation.lat,
    restaurantLocation.lng,
    customerLocation.lat,
    customerLocation.lng,
    riderLocation?.lat,
    riderLocation?.lng,
  ])

  if (apiError) {
    return <div ref={leafletContainerRef} style={{ width, height, borderRadius: 12, overflow: 'hidden' }} />
  }

  if (!apiLoaded) return <div style={{ width, height, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading map...</div>
  return <div ref={mapContainerRef} style={{ width, height }} />
}

export default DeliveryMap
