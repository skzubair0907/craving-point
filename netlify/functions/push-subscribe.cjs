const { URL } = require('url')

module.exports = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
    const body = JSON.parse(event.body || '{}')
    const sub = body.subscription
    if (!sub || !sub.endpoint) return { statusCode: 400, body: 'Missing subscription' }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return { statusCode: 500, body: 'Supabase not configured' }

    const payload = {
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh || null,
      auth: sub.keys?.auth || null,
      user_id: body.user_id || null,
      order_number: body.order_number || null,
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/notification_subscriptions`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { statusCode: 502, body: `Upstream error: ${res.status} ${text}` }
    }
    const data = await res.json()
    return { statusCode: 200, body: JSON.stringify(data) }
  } catch (err) {
    return { statusCode: 500, body: String(err) }
  }
}
