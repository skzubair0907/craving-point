const { randomBytes, randomUUID, createHash } = require('node:crypto')
const { buildOrder } = require('./order.cjs')
const { repository, configured } = require('./repository.cjs')
const payments = require('./payments.cjs')
const DEFAULT_RESTAURANT_LOCATION = { lat: 19.0175, lng: 72.8905 }
const DEFAULT_CUSTOMER_LOCATION = (restaurantLocation = DEFAULT_RESTAURANT_LOCATION) => ({ lat: restaurantLocation.lat + 0.0064, lng: restaurantLocation.lng + 0.0081 })
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }) }
const publicOrder = row => ({ ...row.payload, trackingToken: row.tracking_token })
const receipt = row => ({ success: true, order: publicOrder(row), ...(row.payment_order_id && row.payload.payment_status !== 'paid' ? { payment: { key: process.env.RAZORPAY_KEY_ID, order_id: row.payment_order_id, amount: Math.round(row.payload.total * 100), currency: 'INR' } } : {}) })
async function authorize(repo, payload) {
  if (typeof payload.orderId !== 'string' || typeof payload.token !== 'string' || payload.token.length !== 64) fail(404, 'Order not found. Check your order receipt.')
  const row = await repo.find('order_number', payload.orderId)
  if (!row?.tracking_token || !payments.equal(row.tracking_token, payload.token)) fail(404, 'Order not found. Check your order receipt.')
  return row
}
async function handle(action, payload, { local = false, repo = repository(local) } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail(400, 'Invalid request')
  if (action === 'paymentConfig') return { onlineAvailable: payments.available() && (configured() || local) }
  if (action === 'createOrder') {
    const requestId = payload.requestId || randomUUID()
    if (!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(requestId)) fail(400, 'Invalid request ID')
    const hash = createHash('sha256').update(JSON.stringify({ customer: payload.customer, items: payload.items, meta: { orderType: payload.meta?.orderType, coupon: payload.meta?.coupon || '', payment: payload.meta?.payment || 'cod' } })).digest('hex')
    const existing = payload.meta?.preview ? null : await repo.find('request_id', requestId)
    if (existing) {
      if (existing.request_hash !== hash) fail(409, 'This order attempt has different details. Please start a new checkout.')
      return receipt(existing)
    }
    const catalog = await repo.catalog()
    const order = buildOrder(payload, catalog.menuItems, catalog)
    const online = payments.available() && (configured() || local)
    if (payload.meta?.preview) return { success: true, order, preview: true, onlineAvailable: online }
    if (!local && !configured()) fail(503, 'Online ordering is unavailable. Please order by phone or WhatsApp.')
    if (payload.meta?.payment === 'online' && !online) fail(503, 'Online payment is unavailable. Choose payment on delivery or pickup.')
    if (payload.expectedTotal !== undefined && Math.round(Number(payload.expectedTotal) * 100) !== Math.round(order.total * 100)) {
      return { requiresReview: true, order, onlineAvailable: online }
    }
    const row = { order_number: order.id, payload: order, request_id: requestId, request_hash: hash, tracking_token: randomBytes(32).toString('hex') }
    if (order.meta.payment === 'online') {
      if (order.total <= 0) fail(400, 'Choose payment at pickup or delivery for a zero-total order.')
      const payment = await payments.razorpay('orders', { amount: Math.round(order.total * 100), currency: 'INR', receipt: requestId, notes: { order_number: order.id } })
      row.payment_order_id = payment.id
    }
    try { return receipt(await repo.insert(row)) } catch (error) {
      if (error.statusCode === 409) {
        const saved = await repo.find('request_id', requestId)
        if (saved?.request_hash === hash) return receipt(saved)
      }
      throw error
    }
  }
  if (action === 'orderStatus') {
    let row = await authorize(repo, payload)
    // Recover a captured payment even if the customer closed the payment window.
    if (row.payment_order_id && row.payload.payment_status !== 'paid' && payments.available()) {
      try {
        const result = await payments.razorpay(`orders/${encodeURIComponent(row.payment_order_id)}/payments`)
        const captured = result.items?.find(payment => payments.validPayment(payment, row))
        if (captured) row = await repo.payment(row, captured.id)
      } catch { /* The saved state remains visible during provider downtime. */ }
    }
    const restaurantLocation = row.payload.restaurantLocation || DEFAULT_RESTAURANT_LOCATION
    const customerLocation = row.payload.customerLocation || DEFAULT_CUSTOMER_LOCATION(restaurantLocation)
    let deliveryLocation = null
    try {
      deliveryLocation = await repo.deliveryLocation(row.order_number)
    } catch {
      // Tracking is optional. A missing location must never block receipt/status access.
    }
    return {
      order: {
        id: row.order_number,
        status: row.payload.status,
        payment_status: row.payload.payment_status || 'pending',
        orderType: row.payload.meta.orderType,
        total: row.payload.total,
        created_at: row.payload.created_at,
        preparation_minutes: row.payload.preparation_minutes,
        updated_at: row.payload.updated_at,
        trackingToken: row.tracking_token,
        restaurantLocation,
        customerLocation,
        deliveryLocation,
      },
    }
  }
  if (action === 'verifyPayment') {
    const row = await authorize(repo, payload)
    if (!row.payment_order_id || typeof payload.paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(payload.paymentId)) fail(400, 'Invalid payment')
    const expected = payments.signature(`${row.payment_order_id}|${payload.paymentId}`, process.env.RAZORPAY_KEY_SECRET || '')
    if (!payments.equal(expected, payload.signature)) fail(400, 'Payment verification failed')
    const payment = await payments.razorpay(`payments/${encodeURIComponent(payload.paymentId)}`)
    if (!payments.validPayment(payment, row)) fail(409, 'Payment is awaiting capture. Your receipt will update after payment confirmation.')
    return receipt(await repo.payment(row, payment.id))
  }
  if (action === 'submitReview') {
    const row = await authorize(repo, payload)
    if (!['delivered', 'picked_up'].includes(row.payload.status)) fail(400, 'You can review an order after it is completed.')
    if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5 || typeof payload.review !== 'string' || payload.review.trim().length < 3 || payload.review.length > 1000) fail(400, 'Enter a rating and a review between 3 and 1000 characters.')
    const firstName = String(row.payload.customer?.name || 'Customer').trim().split(/\s+/)[0].slice(0, 50)
    await repo.review({ order_number: row.order_number, name: firstName, rating: payload.rating, review: payload.review.trim() })
    return { success: true }
  }
  fail(404, 'Not found')
}
async function webhook(raw, providedSignature, repo = repository()) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !payments.equal(payments.signature(raw, process.env.RAZORPAY_WEBHOOK_SECRET), providedSignature)) fail(400, 'Invalid webhook signature')
  const event = JSON.parse(raw)
  if (event.event !== 'payment.captured') return { success: true }
  const payment = event.payload?.payment?.entity
  if (!payment?.order_id) fail(400, 'Invalid payment event')
  const row = await repo.find('payment_order_id', payment.order_id)
  if (!row) fail(503, 'Order not available yet. Retry webhook.')
  if (!payments.validPayment(payment, row)) fail(400, 'Payment does not match this order')
  await repo.payment(row, payment.id)
  return { success: true }
}
module.exports = { handle, webhook }
