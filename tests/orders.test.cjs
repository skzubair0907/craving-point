const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { buildOrder } = require('../api/order.cjs')
const menu = JSON.parse(fs.readFileSync('data/menu.json', 'utf8'))
const payload = (overrides = {}) => ({ customer: { name: 'Test Customer', phone: '9000000000', address: 'Test address' }, items: [{ id: menu[0].id, quantity: 2 }], meta: { orderType: 'delivery' }, ...overrides })

test('canonical prices override client prices and retain customer details', () => {
  const request = payload({ items: [{ id: menu[0].id, quantity: 2, price: .01 }] })
  const order = buildOrder(request, menu)
  assert.equal(order.subtotal, menu[0].price * 2)
  assert.deepEqual(order.customer, request.customer)
})
test('pickup does not charge delivery', () => {
  const delivery = buildOrder(payload(), menu)
  const pickup = buildOrder(payload({ meta: { orderType: 'pickup' } }), menu)
  assert.equal(pickup.delivery, 0)
  assert.equal(delivery.total - pickup.total, 40)
})
test('selected size is priced by the server', () => {
  const item = menu.find(item => item.price_variants?.length > 1)
  const variant = item.price_variants[1]
  const order = buildOrder(payload({ items: [{ id: item.id + '::size', productId: item.id, selectedVariant: variant.label, quantity: 3, price: .01 }] }), menu)
  assert.equal(order.subtotal, variant.price * 3)
  assert.ok(order.items[0].name.includes(variant.label))
})
test('coupon is capped at subtotal and tax applies after discount', () => {
  const order = buildOrder(payload({ items: [{ id: menu[0].id, quantity: 1 }], meta: { orderType: 'pickup', coupon: 'CRAVE50' } }), menu)
  assert.equal(order.discount, Math.min(50, menu[0].price))
  assert.equal(order.tax, Number(((order.subtotal - order.discount) * .05).toFixed(2)))
  assert.ok(order.total >= 0)
})
test('invalid quantities, products, sizes and payment methods are rejected', () => {
  for (const quantity of [-1, 0, 1.5, 100, NaN, '2']) assert.throws(() => buildOrder(payload({ items: [{ id: menu[0].id, quantity }] }), menu), /Quantity/)
  assert.throws(() => buildOrder(payload({ items: [{ id: 'missing', quantity: 1 }] }), menu), /available/)
  assert.throws(() => buildOrder(payload({ items: [{ id: menu[0].id, quantity: 1, selectedVariant: 'missing' }] }), menu), /size/)
  assert.throws(() => buildOrder(payload({ meta: { orderType: 'delivery', payment: 'unknown' } }), menu), /payment/)
  assert.throws(() => buildOrder(payload({ customer: {} }), menu), /name/)
})
test('Netlify preview is read-only and missing persistence never reports success', async () => {
  const previousUrl = process.env.SUPABASE_URL
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const { handler } = await import('../netlify/functions/createOrder.js')
    const preview = await handler({ httpMethod: 'POST', body: JSON.stringify(payload({ meta: { orderType: 'delivery', preview: true } })) })
    assert.equal(preview.statusCode, 200)
    assert.equal(JSON.parse(preview.body).preview, true)
    assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(payload()) })).statusCode, 503)
    assert.equal((await handler({ httpMethod: 'POST', body: '{' })).statusCode, 400)
    assert.equal((await handler({ httpMethod: 'GET' })).statusCode, 405)
  } finally {
    if (previousUrl !== undefined) process.env.SUPABASE_URL = previousUrl
    if (previousKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  }
})
