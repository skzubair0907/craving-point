// Cloudflare Pages Functions entry point.
// Requires the nodejs_compat flag because the existing trusted order service
// uses Node's crypto implementation for order IDs and payment signatures.
import response from '../../api/netlify.cjs'

const actions = new Set([
  'createOrder',
  'paymentConfig',
  'orderStatus',
  'verifyPayment',
  'submitReview',
  'webhook',
])

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

export async function onRequest(context) {
  const { request, env, params } = context
  const action = params.action
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!actions.has(action)) return json(404, { error: 'Not found' })

  const body = await request.text()
  if (body.length > 100000) return json(413, { error: 'Request is too large' })

  // The existing service reads server-only configuration from process.env.
  // These values are provided by Cloudflare Pages at request time and are not
  // included in the browser bundle.
  Object.assign(process.env, env)
  const result = await response.endpoint(action)({
    httpMethod: request.method,
    body,
    headers: Object.fromEntries(request.headers),
  })
  return new Response(result.body, { status: result.statusCode, headers: result.headers })
}
