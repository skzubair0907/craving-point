const fetch = require('node-fetch')

module.exports = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

    // Internal-only: require internal token
    const internalToken = event.headers['x-internal-token'] || event.headers['X-Internal-Token']
    if (!internalToken || internalToken !== process.env.PUSH_INTERNAL_TOKEN) return { statusCode: 401, body: 'Unauthorized' }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.SUPABASE_URL
    if (!serviceKey || !supabaseUrl) return { statusCode: 500, body: 'Missing Supabase config' }

    const body = event.body || '{}'
    let parsed = {}
    try { parsed = JSON.parse(body) } catch (e) { parsed = {} }
    const orderId = parsed.order_id
    if (!orderId) return { statusCode: 400, body: 'Missing order_id' }

    const restUrl = supabaseUrl.replace(/\/$/, '') + '/rest/v1/notification_subscriptions'
    const query = `?order_number=eq.${encodeURIComponent(orderId)}&select=id,endpoint,p256dh,auth,created_at&limit=100`

    const res = await fetch(restUrl + query, { method: 'GET', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
    if (!res.ok) {
      const text = await res.text()
      return { statusCode: res.status, body: text }
    }
    const data = await res.json()
    const count = Array.isArray(data) ? data.length : 0
    return { statusCode: 200, body: JSON.stringify({ count, samples: data.slice(0, 10) }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: String(err) }
  }
}
