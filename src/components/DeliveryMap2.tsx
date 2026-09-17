import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsApi, initMap, addMarker, updateMarker, addPolyline, updatePolyline, resolveMapCenter } from '../lib/mapUtils'

export interface DeliveryMapProps {
  customerLocation: { lat: number; lng: number }
  riderLocation?: { lat: number; lng: number } | null
  height?: string | number
  width?: string | number
}

export const DeliveryMap = ({
  customerLocation,
  riderLocation = null,
  height = '400px',
  width = '100%',
}: DeliveryMapProps): JSX.Element => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const customerMarkerRef = useRef<google.maps.Marker | null>(null)
  const riderMarkerRef = useRef<google.maps.Marker | null>(null)
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const [apiLoaded, setApiLoaded] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const safeCustomerLocation = resolveMapCenter({
    customerLocation,
    riderLocation,
    fallbackLocation: { lat: 19.0175, lng: 72.8905 },
  })

  const riderMarkerIcon = {
    url: '/images/delivery-boy-marker.svg',
    scaledSize: new google.maps.Size(72, 72),
    anchor: new google.maps.Point(36, 72),
    labelOrigin: new google.maps.Point(36, 18),
  }

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
      bounds.extend(safeCustomerLocation)
      if (riderLocation) bounds.extend(riderLocation)
      const map = initMap(mapContainerRef.current, { center: bounds.getCenter(), zoom: 15 })
      mapRef.current = map
      if (riderLocation) map.fitBounds(bounds)
      else map.setZoom(16)
      customerMarkerRef.current = addMarker(map, safeCustomerLocation, { title: 'Customer', icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' } })
    }
    if (riderLocation) {
      if (riderMarkerRef.current) updateMarker(riderMarkerRef.current, riderLocation)
      else if (mapRef.current) riderMarkerRef.current = addMarker(mapRef.current, riderLocation, { title: 'Rider', icon: riderMarkerIcon })
      const path: google.maps.LatLngLiteral[] = [riderLocation, safeCustomerLocation]
      if (polylineRef.current) updatePolyline(polylineRef.current, path)
      else if (mapRef.current) polylineRef.current = addPolyline(mapRef.current, path, { strokeColor: '#FF0000', strokeOpacity: 0.8, strokeWeight: 4 })
    } else {
      if (riderMarkerRef.current) { riderMarkerRef.current.setMap(null); riderMarkerRef.current = null }
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null }
    }
  }, [apiLoaded, safeCustomerLocation.lat, safeCustomerLocation.lng, riderLocation?.lat, riderLocation?.lng])

  useEffect(() => () => {
    if (mapRef.current) mapRef.current = null
    if (customerMarkerRef.current) customerMarkerRef.current.setMap(null)
    if (riderMarkerRef.current) riderMarkerRef.current.setMap(null)
    if (polylineRef.current) polylineRef.current.setMap(null)
  }, [])

  // Leaflet fallback effect: run the hook unconditionally but only initialize when `apiError` is set.
  useEffect(() => {
    if (!apiError) return
    if (!leafletContainerRef.current) return
    let mounted = true

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

        const centerLat = riderLocation ? (riderLocation.lat + safeCustomerLocation.lat) / 2 : safeCustomerLocation.lat
        const centerLng = riderLocation ? (riderLocation.lng + safeCustomerLocation.lng) / 2 : safeCustomerLocation.lng

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
        const riderIcon = (L as any).icon({
          iconUrl: '/images/delivery-boy-marker.svg',
          iconSize: [64, 64],
          iconAnchor: [32, 64],
          popupAnchor: [0, -54],
        })
        ;(L as any).marker([safeCustomerLocation.lat, safeCustomerLocation.lng], { icon: pin('#2563eb', 'Customer', 'C') }).addTo(map).bindPopup('Customer delivery location')
        if (riderLocation) (L as any).marker([riderLocation.lat, riderLocation.lng], { icon: riderIcon }).addTo(map).bindPopup('Delivery rider live location')

        if (riderLocation) {
          const path: [number, number][] = [[riderLocation.lat, riderLocation.lng], [safeCustomerLocation.lat, safeCustomerLocation.lng]]
          ;(L as any).polyline(path, { color: '#ff0000', weight: 4, opacity: 0.8 }).addTo(map)
          map.fitBounds((L as any).latLngBounds(path), { padding: [60, 60] })
        }

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
    customerLocation.lat,
    customerLocation.lng,
    riderLocation?.lat,
    riderLocation?.lng,
  ])

  if (apiError) {
    const fallbackPoint = resolveMapCenter({
      customerLocation,
      riderLocation,
      fallbackLocation: { lat: 19.0175, lng: 72.8905 },
    })
    const encodedCenter = `${fallbackPoint.lat},${fallbackPoint.lng}`

    const fallbackUrl = `https://www.google.com/maps?q=${encodeURIComponent(encodedCenter)}&z=15&output=embed`

    return (
      <div style={{ width, height, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <iframe
          title="Delivery rider map"
          src={fallbackUrl}
          loading="lazy"
          style={{ width: '100%', height: '100%', border: 0 }}
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    )
  }

  if (!apiLoaded) return <div style={{ width, height, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading map...</div>
  return <div ref={mapContainerRef} style={{ width, height }} />
}

export default DeliveryMap
