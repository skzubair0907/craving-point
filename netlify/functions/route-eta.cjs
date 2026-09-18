const fetch = require('node-fetch')

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
    const body = JSON.parse(event.body || '{}')
    const origin = body.origin // { lat, lng }
    const dest = body.dest
    const ttl = Number(body.ttlSeconds || 300)
    if (!origin || !dest) return { statusCode: 400, body: JSON.stringify({ error: 'origin and dest required' }) }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    const MAPBOX_KEY = process.env.MAPBOX_DIRECTIONS_API_KEY || process.env.MAPBOX_API_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Supabase not configured' }) }
    if (!MAPBOX_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Mapbox key not configured' }) }

    // normalize and round coords to 5 decimals for cache key
    const round = (n) => Math.round(Number(n) * 1e5) / 1e5
    const oLat = round(origin.lat)
    const oLng = round(origin.lng)
    const dLat = round(dest.lat)
    const dLng = round(dest.lng)
    const key = `${oLat}:${oLng}|${dLat}:${dLng}`

    // check cache via Supabase REST
    const cacheUrl = `${SUPABASE_URL}/rest/v1/route_eta_cache?select=*&key=eq.${encodeURIComponent(key)}`
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    const cacheRes = await fetch(cacheUrl, { headers })
    if (!cacheRes.ok) return { statusCode: 502, body: JSON.stringify({ error: 'Failed reading cache' }) }
    const cached = await cacheRes.json()
    if (cached && cached.length) {
      const row = cached[0]
      const age = (Date.now() - new Date(row.fetched_at).getTime()) / 1000
      if (age < (row.ttl_seconds || ttl)) {
        return { statusCode: 200, body: JSON.stringify({ cached: true, duration_seconds: row.duration_seconds, geometry: row.geometry }) }
      }
    }

    // fetch directions from Mapbox
    const coords = `${oLng},${oLat};${dLng},${dLat}`
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&alternatives=false&access_token=${MAPBOX_KEY}`
    const res = await fetch(url)
    if (!res.ok) {
      const txt = await res.text()
      return { statusCode: res.status, body: JSON.stringify({ error: txt }) }
    }
    const json = await res.json()
    const duration = json?.routes?.[0]?.duration ? Math.round(json.routes[0].duration) : null
    const geometry = json?.routes?.[0]?.geometry || null

    // upsert cache row
    const upsertUrl = `${SUPABASE_URL}/rest/v1/route_eta_cache?on_conflict=key`
    const bodyRow = { key, origin_lat: oLat, origin_lng: oLng, dest_lat: dLat, dest_lng: dLng, duration_seconds: duration, geometry: geometry, ttl_seconds: ttl }
    try {
      await fetch(upsertUrl, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify(bodyRow) })
    } catch (e) { }

    return { statusCode: 200, body: JSON.stringify({ cached: false, duration_seconds: duration, geometry }) }

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
