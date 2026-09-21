export async function getRouteGeoJSON(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) {
  const originStr = `${origin.lng},${origin.lat}`
  const destStr = `${dest.lng},${dest.lat}`

  // The production application is hosted on Cloudflare, while the legacy
  // route endpoints below are Netlify-only. Use the public OSRM route service
  // there so riders and customers see the actual road route, not just a line.
  if (window.location.hostname.endsWith('.workers.dev')) {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originStr};${destStr}?overview=full&geometries=geojson`,
      )
      if (!response.ok) throw new Error(`OSRM returned ${response.status}`)
      const data = await response.json()
      if (data?.code === 'Ok' && Array.isArray(data.routes) && data.routes.length) return data
    } catch (error) {
      console.warn('Road route is unavailable; showing the direct route instead.', error)
    }
    return null
  }

  // Prefer server-side cached route (route-eta) which returns geometry + duration
  try {
    const etaRes = await fetch('/.netlify/functions/route-eta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, dest, ttlSeconds: 300 }),
    })
    if (etaRes.ok) {
      const etaJson = await etaRes.json()
      // route-eta returns { geometry, duration_seconds }
      if (etaJson && (etaJson.geometry || etaJson.routes)) {
        // Normalize to Mapbox-like response shape expected by callers
        if (etaJson.routes) return etaJson
        return { routes: [{ geometry: etaJson.geometry, duration: etaJson.duration_seconds }] }
      }
    }
  } catch (err) {
    // fallthrough to client-side directions call
    console.warn('route-eta call failed, falling back to directions:', err)
  }

  // Fallback to direct directions endpoint (Mapbox proxy)
  const netlifyOriginStr = `${origin.lat},${origin.lng}`
  const netlifyDestStr = `${dest.lat},${dest.lng}`
  try {
    const res = await fetch(`/.netlify/functions/directions?origin=${encodeURIComponent(netlifyOriginStr)}&dest=${encodeURIComponent(netlifyDestStr)}`)
    if (!res.ok) throw new Error(`Directions API returned ${res.status}`)
    const json = await res.json()
    return json
  } catch (err) {
    console.error('getRouteGeoJSON error', err)
    return null
  }
}
