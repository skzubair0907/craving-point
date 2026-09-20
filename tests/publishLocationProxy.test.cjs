const test = require('node:test')
const assert = require('node:assert/strict')

test('publish-location-proxy returns 200 on successful upsert', async () => {
  const oldEnv = { ...process.env }
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    // minimal routing based on path
    if (url.endsWith('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'user-1', email: 'rider@example.com' }) }
    }
    if (url.includes('/order_requests')) {
      return { ok: true, json: async () => ([{ id: 'order-1' }]) }
    }
    if (url.includes('/order_admin_details')) {
      return { ok: true, json: async () => ([{ delivery_staff_id: 'staff-1' }]) }
    }
    if (url.includes('/delivery_staff')) {
      return { ok: true, json: async () => ([{ id: 'staff-1', user_id: 'user-1', email: 'rider@example.com', active: true }]) }
    }
    if (url.includes('/delivery_tracking?on_conflict')) {
      return { ok: true, json: async () => ([{ order_number: 'ORD123', latitude: 1, longitude: 2 }]) }
    }
    if (url.includes('/delivery_tracking_audit')) {
      return { ok: true, json: async () => ([]), text: async () => '' }
    }
    return { ok: false, status: 500, text: async () => 'not found' }
  }

  const event = {
    httpMethod: 'POST',
    headers: { Authorization: 'Bearer rider-session-token' },
    body: JSON.stringify({ order_number: 'ORD123', latitude: 12.34, longitude: 56.78, accuracy: 5 }),
  }

  // require the module after installing fetch mock so its internal `fetch` binding
  // picks up the mocked implementation during module initialization
  delete require.cache[require.resolve('../netlify/functions/publish-location-proxy.cjs')]
  const proxy = require('../netlify/functions/publish-location-proxy.cjs')
  const res = await proxy(event)
  // debug trace when tests fail
  if (res.statusCode !== 200) console.error('publish success response:', res)
  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.equal(body.success, true)

  globalThis.fetch = originalFetch
  process.env = oldEnv
})

test('publish-location-proxy returns 401 for invalid session token', async () => {
  const oldEnv = { ...process.env }
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, opts = {}) => {
    if (url.endsWith('/auth/v1/user')) {
      return { ok: false, status: 401, text: async () => 'unauthorized' }
    }
    return { ok: false, status: 500, text: async () => 'not found' }
  }

  const event = {
    httpMethod: 'POST',
    headers: { Authorization: 'Bearer bad-token' },
    body: JSON.stringify({ order_number: 'ORD123', latitude: 12.34, longitude: 56.78 }),
  }

  delete require.cache[require.resolve('../netlify/functions/publish-location-proxy.cjs')]
  const proxy = require('../netlify/functions/publish-location-proxy.cjs')
  const res = await proxy(event)
  if (res.statusCode !== 401) console.error('publish auth failure response:', res)
  assert.equal(res.statusCode, 401)

  globalThis.fetch = originalFetch
  process.env = oldEnv
})
