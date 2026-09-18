const fetch = require('node-fetch')

// Simple in-memory cache for short-lived results
const cache = new Map()
const CACHE_TTL = 1000 * 60 * 2 // 2 minutes

exports.handler = async function (event) {
  try {
    const qs = event.queryStringParameters || {}
    const origin = qs.origin // expected "lat,lng"
    const dest = qs.dest
    const profile = qs.profile || 'driving'
    if (!origin || !dest) return { statusCode: 400, body: JSON.stringify({ error: 'origin and dest are required' }) }

    const key = `${origin}|${dest}|${profile}`
    const now = Date.now()
    const cached = cache.get(key)
    if (cached && now - cached.t < CACHE_TTL) {
      return { statusCode: 200, body: JSON.stringify(cached.v) }
    }

    const MAPBOX_KEY = process.env.MAPBOX_DIRECTIONS_API_KEY || process.env.MAPBOX_API_KEY
    if (!MAPBOX_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Mapbox API key not configured' }) }

    // origin and dest expected as lat,lng -> Mapbox expects lng,lat
    const [olat, olng] = origin.split(',')
    const [dlat, dlng] = dest.split(',')
    const coords = `${olng},${olat};${dlng},${dlat}`
    const url = `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(profile)}/${coords}?geometries=geojson&overview=full&alternatives=false&access_token=${MAPBOX_KEY}`

    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      const text = await res.text()
      return { statusCode: res.status, body: JSON.stringify({ error: text }) }
    }
    const json = await res.json()
    cache.set(key, { t: now, v: json })
    return { statusCode: 200, body: JSON.stringify(json) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
