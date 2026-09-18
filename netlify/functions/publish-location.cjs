// Internal-only: publish rider location using Supabase service role.
// Requires LOCATION_INTERNAL_TOKEN (or falls back to PUSH_INTERNAL_TOKEN) and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
const fetch = globalThis.fetch || require('node-fetch')

module.exports = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
    const internalToken = event.headers['x-internal-token'] || event.headers['X-Internal-Token']
    const expected = process.env.LOCATION_INTERNAL_TOKEN || process.env.PUSH_INTERNAL_TOKEN
    if (!expected) return { statusCode: 500, body: 'Missing LOCATION_INTERNAL_TOKEN' }
    if (!internalToken || internalToken !== expected) return { statusCode: 401, body: 'Unauthorized' }

    const body = JSON.parse(event.body || '{}')
    const { order_number, latitude, longitude, accuracy = null } = body
    if (!order_number || typeof latitude !== 'number' || typeof longitude !== 'number') return { statusCode: 400, body: 'Invalid payload' }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, body: 'Supabase not configured' }

    const rpcUrl = `${SUPABASE_URL.replace(/\/+$/,'')}/rpc/set_delivery_location`
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_order_number: order_number, p_latitude: latitude, p_longitude: longitude, p_accuracy: accuracy }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(()=>String(res.status))
      return { statusCode: 502, body: `Supabase RPC error: ${text}` }
    }

    // RPC returns null on success typically
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (err) {
    return { statusCode: 500, body: String(err) }
  }
}
