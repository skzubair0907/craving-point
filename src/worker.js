// Cloudflare Worker entry point: serves the Vite application and trusted API.
import response from '../api/netlify.cjs'

const actions = new Set(['createOrder', 'paymentConfig', 'orderStatus', 'verifyPayment', 'submitReview', 'webhook'])

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/api\/([^/]+)$/)
    if (!match) return env.ASSETS.fetch(request)

    const action = match[1]
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })
    if (!actions.has(action)) return json(404, { error: 'Not found' })

    const body = await request.text()
    if (body.length > 100000) return json(413, { error: 'Request is too large' })

    Object.assign(process.env, env)
    const result = await response.endpoint(action)({
      httpMethod: request.method,
      body,
      headers: Object.fromEntries(request.headers),
    })
    return new Response(result.body, { status: result.statusCode, headers: result.headers })
  },
}
