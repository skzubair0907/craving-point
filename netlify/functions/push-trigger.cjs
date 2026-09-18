const fetch = require('node-fetch')

module.exports = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

    const authHeader = event.headers['authorization'] || event.headers['Authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, body: 'Missing auth' }
    const userToken = authHeader.replace(/^Bearer\s+/, '')

    // Get user info from Supabase Auth
    const supabaseUrl = process.env.SUPABASE_URL
    if (!supabaseUrl) return { statusCode: 500, body: 'Missing SUPABASE_URL' }

    const userRes = await fetch(supabaseUrl + '/auth/v1/user', { method: 'GET', headers: { Authorization: 'Bearer ' + userToken } })
    if (userRes.status !== 200) return { statusCode: 401, body: 'Invalid session' }
    const user = await userRes.json()
    const userId = user?.id
    if (!userId) return { statusCode: 401, body: 'Invalid user' }

    // Use service role key to check admin/staff tables
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY' }

    const restUrl = supabaseUrl + '/rest/v1'

    // Check admin_staff table
    const staffRes = await fetch(`${restUrl}/admin_staff?user_id=eq.${encodeURIComponent(userId)}&select=role,active`, { method: 'GET', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
    if (staffRes.ok) {
      const staff = await staffRes.json()
      if (Array.isArray(staff) && staff.length && staff[0].active) {
        // authorized
      } else {
        // fallback: check profiles.role === 'admin'
        const profRes = await fetch(`${restUrl}/profiles?id=eq.${encodeURIComponent(userId)}&select=role`, { method: 'GET', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
        if (!profRes.ok) return { statusCode: 403, body: 'Forbidden' }
        const profiles = await profRes.json()
        const role = profiles?.[0]?.role
        if (role !== 'admin') return { statusCode: 403, body: 'Forbidden' }
      }
    } else {
      return { statusCode: 500, body: 'Failed to check admin' }
    }

    // Authorized: forward to internal push-send with internal token
    const body = event.body || '{}'
    const parsed = (() => { try { return JSON.parse(body) } catch (e) { return {} } })()
    const action = parsed.action || 'send'
    const siteUrl = process.env.SITE_URL || ''
    const base = (siteUrl ? siteUrl.replace(/\/$/, '') : '')
    const internalToken = process.env.PUSH_INTERNAL_TOKEN
    if (!internalToken) return { statusCode: 500, body: 'Missing PUSH_INTERNAL_TOKEN' }

    // choose target internal function
    let forwardUrl = base + '/.netlify/functions/push-send'
    if (action === 'list') forwardUrl = base + '/.netlify/functions/push-list'

    const forwardRes = await fetch(forwardUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-token': internalToken }, body })
    const text = await forwardRes.text()
    return { statusCode: forwardRes.status, body: text }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: String(err) }
  }
}
