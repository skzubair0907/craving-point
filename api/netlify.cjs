const { handle, webhook } = require('./service.cjs')
const response = (statusCode, data) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(data) })
exports.endpoint = action => async event => {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' })
  if ((event.body || '').length > 100000) return response(413, { error: 'Request is too large' })
  try {
    if (action === 'webhook') return response(200, await webhook(event.body || '', event.headers['x-razorpay-signature']))
    let payload
    try { payload = JSON.parse(event.body || '{}') } catch { return response(400, { error: 'Invalid JSON' }) }
    return response(200, await handle(action, payload))
  } catch (error) { return response(error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to complete this request. Please try again or contact the restaurant.' }) }
}
