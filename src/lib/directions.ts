export async function getRouteGeoJSON(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) {
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
