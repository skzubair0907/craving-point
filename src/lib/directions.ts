export async function getRouteGeoJSON(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) {
  // The production worker is hosted on Cloudflare. The legacy route endpoints
  // below only exist on Netlify, so calling them from any of the three live
  // maps produces a 404 even when GPS tracking is working. The map component
  // has a reliable straight-line fallback and distance-based ETA.
  if (window.location.hostname.endsWith('.workers.dev')) return null

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
  const originStr = `${origin.lat},${origin.lng}`
  const destStr = `${dest.lat},${dest.lng}`
  try {
    const res = await fetch(`/.netlify/functions/directions?origin=${encodeURIComponent(originStr)}&dest=${encodeURIComponent(destStr)}`)
    if (!res.ok) throw new Error(`Directions API returned ${res.status}`)
    const json = await res.json()
    return json
  } catch (err) {
    console.error('getRouteGeoJSON error', err)
    return null
  }
}
