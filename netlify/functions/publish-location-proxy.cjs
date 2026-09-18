// Proxy for rider browsers: validate Supabase session token, verify assignment,
// then upsert delivery_tracking via service role so RLS doesn't block.
const fetch = globalThis.fetch || require('node-fetch')

module.exports = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return { statusCode: 401, body: 'Missing bearer token' }
    const token = authHeader.split(' ')[1]

    const body = JSON.parse(event.body || '{}')
    const { order_number, latitude, longitude, accuracy = null } = body
    if (!order_number || typeof latitude !== 'number' || typeof longitude !== 'number') return { statusCode: 400, body: 'Invalid payload' }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) return { statusCode: 500, body: 'Supabase not configured' }

    // Validate session token and get user info
    const userRes = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined })
    if (!userRes.ok) return { statusCode: 401, body: 'Invalid session token' }
    const user = await userRes.json()
    if (!user || !user.id) return { statusCode: 401, body: 'Invalid user' }

    // Lookup order id from order_number
    const orderQ = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/order_requests?order_number=eq.${encodeURIComponent(order_number)}&select=id`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined })
    if (!orderQ.ok) return { statusCode: 502, body: 'Failed to lookup order' }
    const orderRows = await orderQ.json()
    if (!orderRows || !orderRows.length) return { statusCode: 404, body: 'Order not found' }
    const orderId = orderRows[0].id

    // Find delivery_staff assigned for this order
    const adminRowsRes = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/order_admin_details?order_id=eq.${encodeURIComponent(orderId)}&select=delivery_staff_id`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined })
    if (!adminRowsRes.ok) return { statusCode: 502, body: 'Failed to lookup assignment' }
    const adminRows = await adminRowsRes.json()
    const staffId = adminRows && adminRows[0] && adminRows[0].delivery_staff_id
    if (!staffId) return { statusCode: 403, body: 'No delivery staff assigned' }

    const staffRes = await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/delivery_staff?id=eq.${encodeURIComponent(staffId)}&select=id,user_id,email,active`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined })
    if (!staffRes.ok) return { statusCode: 502, body: 'Failed to fetch staff record' }
    const staffRows = await staffRes.json()
    if (!staffRows || !staffRows.length) return { statusCode: 403, body: 'Assigned delivery staff not found' }
    const staff = staffRows[0]
    if (!staff.active) return { statusCode: 403, body: 'Assigned delivery staff is not active' }

    const lower = (s)=> String(s||'').toLowerCase()
    if (!(staff.user_id === user.id || lower(staff.email) === lower(user.email))) return { statusCode: 403, body: 'This user is not assigned to the order' }

    // Upsert delivery_tracking row using service role. Set updated_by to the rider user id for audit.
    const trackUrl = `${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/delivery_tracking?on_conflict=order_number`
    const now = new Date().toISOString()
    const upsertRes = await fetch(trackUrl, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify([{ order_number, latitude, longitude, accuracy, updated_at: now, updated_by: user.id }]),
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    })
    if (!upsertRes.ok) {
      const t = await upsertRes.text().catch(()=>String(upsertRes.status))
      return { statusCode: 502, body: `Failed upserting location: ${t}` }
    }

    // Insert audit row
    try {
      await fetch(`${SUPABASE_URL.replace(/\/+$/,'')}/rest/v1/delivery_tracking_audit`, {
        method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ order_number, latitude, longitude, accuracy, updated_at: now, updated_by: user.id }]),
      })
    } catch (e) { /* non-fatal */ }

    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  } catch (err) {
    return { statusCode: 500, body: String(err) }
  }
}
