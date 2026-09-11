const http = require('node:http')
try { process.loadEnvFile?.() } catch { /* Hosting can provide variables directly. */ }
const { handle, webhook } = require('./service.cjs')
const routes = { '/orders': 'createOrder', '/api/orders': 'createOrder', '/api/createOrder': 'createOrder', '/api/paymentConfig': 'paymentConfig', '/api/orderStatus': 'orderStatus', '/api/verifyPayment': 'verifyPayment', '/api/submitReview': 'submitReview', '/api/paymentWebhook': 'webhook' }
const server = http.createServer((req, res) => {
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
  const action = routes[req.url]
  if (req.method !== 'POST' || !action) return send(404, { error: 'Not found' })
  let body = ''
  req.on('data', chunk => { body += chunk; if (body.length > 100000) req.destroy() })
  req.on('end', async () => {
    try {
      let payload
      try { payload = JSON.parse(body) } catch { return send(400, { error: 'Invalid JSON' }) }
      const result = action === 'webhook' ? await webhook(body, req.headers['x-razorpay-signature']) : await handle(action, payload, { local: true })
      send(200, result)
    } catch (error) { send(error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to complete the request' }) }
  })
})
server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error('The order API port is already in use. Stop the other running development/API terminal with Ctrl+C, then run npm run dev again.')
  else console.error('Unable to start the order API:', error.message)
  process.exitCode = 1
})
server.listen(process.env.API_PORT || 8787, '127.0.0.1', () => console.log('Local order API ready'))
