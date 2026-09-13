const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { randomUUID } = require('node:crypto')
const { handle, webhook } = require('../api/service.cjs')
const payments = require('../api/payments.cjs')
const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'))
const makePayload = () => ({ requestId: randomUUID(), customer: { name: 'Test Customer', phone: '9000000000', address: 'Test address' }, items: [{ id: catalog.menuItems[0].id, quantity: 2 }], meta: { orderType: 'delivery', payment: 'cod' } })
const memory = () => {
  const rows = []; const reviews = []
  return { rows, reviews, catalog: async () => structuredClone(catalog), find: async (field, value) => rows.find(r => r[field] === value), insert: async row => { rows.push(row); return row }, payment: async (row, id) => { row.payment_id = id; row.payload.payment_status = 'paid'; if (row.payload.status === 'awaiting_payment') row.payload.status = 'placed'; return row }, review: async row => { reviews.push(row) } }
}
test('preview and price changes never save an order; retries save only once', async () => {
  const repo = memory(); const payload = makePayload()
  const preview = await handle('createOrder', { ...payload, meta: { ...payload.meta, preview: true } }, { repo, local: true })
  assert.equal(repo.rows.length, 0)
  const changed = await handle('createOrder', { ...payload, expectedTotal: .01 }, { repo, local: true })
  assert.equal(changed.requiresReview, true); assert.equal(repo.rows.length, 0)
  const created = await handle('createOrder', { ...payload, expectedTotal: preview.order.total }, { repo, local: true })
  const retried = await handle('createOrder', payload, { repo, local: true })
  assert.equal(created.order.id, retried.order.id); assert.equal(repo.rows.length, 1)
  assert.match(created.order.trackingToken, /^[a-f\d]{64}$/)
  await assert.rejects(() => handle('createOrder', { ...payload, customer: { ...payload.customer, name: 'Changed' } }, { repo, local: true }), /different details/)
})
test('tracking requires the private token and excludes customer details', async () => {
  const repo = memory(); const created = await handle('createOrder', makePayload(), { repo, local: true })
  await assert.rejects(() => handle('orderStatus', { orderId: created.order.id, token: '0'.repeat(64) }, { repo, local: true }), /not found/)
  repo.rows[0].payload.status = 'preparing'
  const tracked = await handle('orderStatus', { orderId: created.order.id, token: created.order.trackingToken }, { repo, local: true })
  assert.equal(tracked.order.status, 'preparing'); assert.equal(tracked.order.customer, undefined)
})
test('tracking returns a rider location only through the token-protected order endpoint', async () => {
  const repo = memory()
  repo.deliveryLocation = async () => ({ latitude: 19.0182, longitude: 72.8909, accuracy: 12, updated_at: '2026-09-13T10:00:00.000Z' })
  const created = await handle('createOrder', makePayload(), { repo, local: true })
  await assert.rejects(
    () => handle('orderStatus', { orderId: created.order.id, token: '0'.repeat(64) }, { repo, local: true }),
    /not found/
  )
  const result = await handle('orderStatus', { orderId: created.order.id, token: created.order.trackingToken }, { repo, local: true })
  assert.deepEqual(result.order.deliveryLocation, { latitude: 19.0182, longitude: 72.8909, accuracy: 12, updated_at: '2026-09-13T10:00:00.000Z' })
})

test('a saved order retry returns its receipt even after stock sells out or ordering closes', async () => {
  const repo=memory(),payload=makePayload()
  const first=await handle('createOrder',payload,{repo,local:true})
  repo.catalog=async()=>{throw new Error('Catalog unavailable after order was saved')}
  const retry=await handle('createOrder',payload,{repo,local:true})
  assert.equal(retry.order.id,first.order.id)
  assert.equal(repo.rows.length,1)
})
test('only completed orders can submit reviews and public names are limited', async () => {
  const repo = memory(); const created = await handle('createOrder', makePayload(), { repo, local: true })
  const review = { orderId: created.order.id, token: created.order.trackingToken, rating: 5, review: 'Great food.' }
  await assert.rejects(() => handle('submitReview', review, { repo, local: true }), /completed/)
  repo.rows[0].payload.status = 'delivered'
  await handle('submitReview', review, { repo, local: true })
  assert.equal(repo.reviews[0].name, 'Test'); assert.equal(repo.reviews[0].approved, undefined)
})
test('payment verification checks signatures, captured amount and currency', async () => {
  const repo = memory(); const previous = { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET, webhook: process.env.RAZORPAY_WEBHOOK_SECRET, request: payments.razorpay }
  process.env.RAZORPAY_KEY_ID = 'test_key'; process.env.RAZORPAY_KEY_SECRET = 'test_secret'; process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook'
  let providerPayment
  payments.razorpay = async resource => resource === 'orders' ? { id: 'order_test' } : providerPayment
  try {
    const payload = makePayload(); payload.meta.payment = 'online'
    const created = await handle('createOrder', payload, { repo, local: true })
    assert.equal(created.order.status, 'awaiting_payment')
    const verify = { orderId: created.order.id, token: created.order.trackingToken, paymentId: 'pay_test', signature: payments.signature('order_test|pay_test', 'test_secret') }
    await assert.rejects(() => handle('verifyPayment', { ...verify, signature: 'invalid' }, { repo, local: true }), /verification/)
    providerPayment = { id: 'pay_test', order_id: 'order_test', status: 'captured', currency: 'INR', amount: 1 }
    await assert.rejects(() => handle('verifyPayment', verify, { repo, local: true }), /capture/)
    providerPayment.amount = created.payment.amount
    const paid = await handle('verifyPayment', verify, { repo, local: true })
    assert.equal(paid.order.payment_status, 'paid'); assert.equal(paid.order.status, 'placed')
    repo.rows[0].payload.status = 'preparing'
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: providerPayment } } })
    await assert.rejects(() => webhook(raw, 'bad', repo), /signature/)
    await webhook(raw, payments.signature(raw, 'test_webhook'), repo)
    assert.equal(repo.rows[0].payload.status, 'preparing')
  } finally {
    payments.razorpay = previous.request
    for (const [key, value] of [['RAZORPAY_KEY_ID', previous.id], ['RAZORPAY_KEY_SECRET', previous.secret], ['RAZORPAY_WEBHOOK_SECRET', previous.webhook]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
test('live delivery fees, taxes, coupon conditions and availability control pricing', async () => {
  const repo = memory(); repo.catalog = async () => ({ ...catalog, restaurantSettings: { ...catalog.restaurantSettings, delivery_fee: 75, tax_percentage: 10 }, coupons: [{ code: 'LIVE', type: 'percentage', value: 10, minimum: 0, active: true }] })
  const payload = makePayload(); payload.meta.coupon = 'LIVE'; payload.meta.preview = true
  const result = await handle('createOrder', payload, { repo, local: true })
  assert.equal(result.order.delivery, 75)
  assert.equal(result.order.tax, Number(((result.order.subtotal - result.order.discount) * .1).toFixed(2)))
  repo.catalog = async () => ({ ...catalog, restaurantSettings: { ...catalog.restaurantSettings, online_ordering_enabled: false } })
  await assert.rejects(() => handle('createOrder', payload, { repo, local: true }), /paused/)
})
