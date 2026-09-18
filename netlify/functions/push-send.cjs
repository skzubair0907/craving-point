const webpush = require('web-push')

module.exports = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
    // Internal-only: require secret token to prevent open abuse
    const internalToken = event.headers['x-internal-token'] || event.headers['X-Internal-Token']
    if (!internalToken || internalToken !== process.env.PUSH_INTERNAL_TOKEN) return { statusCode: 401, body: 'Unauthorized' }
    const body = JSON.parse(event.body || '{}')
    const { user_id = null, order_id = null, title = 'Craving Point', message = '' } = body

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    const VAPID_PUBLIC = process.env.PUSH_VAPID_PUBLIC_KEY || process.env.VITE_PUSH_VAPID_PUBLIC_KEY
    const VAPID_PRIVATE = process.env.PUSH_VAPID_PRIVATE_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, body: 'Supabase not configured' }
    if (!VAPID_PRIVATE || !VAPID_PUBLIC) return { statusCode: 500, body: 'VAPID keys not configured' }

    webpush.setVapidDetails('mailto:hello@cravingpoint.in', VAPID_PUBLIC, VAPID_PRIVATE)

    // Build query filter for subscriptions
    let url = `${SUPABASE_URL}/rest/v1/notification_subscriptions?select=*`
    if (user_id) url += `&user_id=eq.${encodeURIComponent(user_id)}`

    const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
    if (!res.ok) return { statusCode: 502, body: `Failed fetching subscriptions: ${res.status}` }
    const subs = await res.json()

    const payload = JSON.stringify({ title, body: message, order_id })
    const results = []
    const logEndpoint = `${SUPABASE_URL}/rest/v1/push_send_logs`
    const logHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }
    for (const s of subs) {
      if (!s.endpoint) continue
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      try {
        await webpush.sendNotification(subscription, payload)
        results.push({ id: s.id, status: 'sent' })
        try {
          // log success
          await fetch(logEndpoint, { method: 'POST', headers: logHeaders, body: JSON.stringify({ order_number: order_id, subscription_id: s.id, endpoint: s.endpoint, status: 'sent', response: null }) })
        } catch (e) { }
      } catch (err) {
        const statusCode = err?.statusCode || (err && err.status) || null
        // Remove stale subscriptions (410 Gone or 404)
        if (statusCode === 410 || statusCode === 404) {
          await fetch(`${SUPABASE_URL}/rest/v1/notification_subscriptions?id=eq.${s.id}`, {
            method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
          })
          results.push({ id: s.id, status: 'removed' })
          try { await fetch(logEndpoint, { method: 'POST', headers: logHeaders, body: JSON.stringify({ order_number: order_id, subscription_id: s.id, endpoint: s.endpoint, status: 'removed', error: String(err) }) }) } catch (e) {}
        } else {
          results.push({ id: s.id, status: 'failed', error: String(err) })
          try { await fetch(logEndpoint, { method: 'POST', headers: logHeaders, body: JSON.stringify({ order_number: order_id, subscription_id: s.id, endpoint: s.endpoint, status: 'failed', error: String(err) }) }) } catch (e) {}
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ count: results.length, results }) }
  } catch (err) {
    return { statusCode: 500, body: String(err) }
  }
}
