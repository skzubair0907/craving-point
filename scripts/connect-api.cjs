const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
for (const action of ['createOrder','orderStatus','verifyPayment','submitReview','paymentWebhook'])fs.writeFileSync('netlify/functions/'+action+'.js', "import response from './_response.cjs'\nexport const handler = response.endpoint('"+(action==='paymentWebhook'?'webhook':action)+"')\n");
edit('api/order.cjs',s=>s.replace('function buildOrder(payload, menu)', 'function buildOrder(payload, menu, catalog = {})').replace("  if (meta.payment && meta.payment !== 'cod') fail('Only payment on delivery or pickup is available')", `  if (meta.payment && !['cod', 'online'].includes(meta.payment)) fail('Invalid payment method')
  const settings = catalog.restaurantSettings || {}
  if (settings.online_ordering_enabled === false) fail('Online ordering is paused. Please call the restaurant.')
  if (meta.orderType === 'delivery' && settings.delivery_available === false) fail('Delivery is unavailable. Choose pickup.')
  if (meta.orderType === 'pickup' && settings.pickup_available === false) fail('Pickup is unavailable. Choose delivery.')`).replace("  const rules = { CRAVE50: 50, LOYAL10: subtotal * .1, NEWUSER15: subtotal * .15, SAVE20: 20 }", `  if (subtotal < (settings.min_order_value || 0)) fail('The minimum order is ₹' + settings.min_order_value)
  const defaults = [{ code: 'CRAVE50', type: 'fixed', value: 50, minimum: 0, active: true }, { code: 'LOYAL10', type: 'percentage', value: 10, minimum: 0, active: true }, { code: 'NEWUSER15', type: 'percentage', value: 15, minimum: 0, active: true }, { code: 'SAVE20', type: 'fixed', value: 20, minimum: 0, active: true }]
  const rules = Object.fromEntries((catalog.coupons || defaults).filter(c => c.active && subtotal >= c.minimum).map(c => [c.code, c.type === 'percentage' ? subtotal * c.value / 100 : c.value]))`).replace("const delivery = meta.orderType === 'pickup' || subtotal > 500 ? 0 : 40", "const delivery = meta.orderType === 'pickup' || subtotal > (settings.free_delivery_above ?? 500) ? 0 : (settings.delivery_fee ?? 40)").replace('((subtotal - discount) * .05)', '((subtotal - discount) * (settings.tax_percentage ?? 5) / 100)').replace("payment: 'cod', coupon: code }, status: 'ORDER_PLACED'", "payment: meta.payment || 'cod', coupon: code }, payment_status: 'pending', preparation_minutes: settings.preparation_minutes || 30, status: meta.payment === 'online' ? 'awaiting_payment' : 'placed'"));
edit('scripts/sync-menu.cjs',s=>s+`\nconst { menuItems, categories, restaurantSettings, offers } = context.exports
const coupons = [{ code: 'CRAVE50', type: 'fixed', value: 50, minimum: 0, active: true }, { code: 'SAVE20', type: 'fixed', value: 20, minimum: 0, active: true }, { code: 'LOYAL10', type: 'percentage', value: 10, minimum: 0, active: true }, { code: 'NEWUSER15', type: 'percentage', value: 15, minimum: 0, active: true }]
fs.writeFileSync('data/catalog.json', JSON.stringify({ menuItems, categories, restaurantSettings: { ...restaurantSettings, tax_percentage: 5, delivery_available: true, pickup_available: true, min_order_value: 0, preparation_minutes: 30 }, offers, coupons, reviews: [] }, null, 2) + '\\n')
`);
edit('netlify.toml',s=>s.replace('included_files = ["data/menu.json"]', 'included_files = ["data/menu.json", "data/catalog.json"]'));
fs.writeFileSync('api/server.cjs', `const http = require('node:http')
try { process.loadEnvFile?.() } catch { /* Hosting can provide variables directly. */ }
const { handle, webhook } = require('./service.cjs')
const routes = { '/orders': 'createOrder', '/api/orders': 'createOrder', '/api/createOrder': 'createOrder', '/api/orderStatus': 'orderStatus', '/api/verifyPayment': 'verifyPayment', '/api/submitReview': 'submitReview', '/api/paymentWebhook': 'webhook' }
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
server.listen(process.env.API_PORT || 8787, '127.0.0.1', () => console.log('Local order API ready'))
`);
edit('vite.config.ts',s=>s.replace("'/api/orders': { target: 'http://127.0.0.1:8787', rewrite: () => '/orders' }", "'/api': { target: 'http://127.0.0.1:8787' }"));
