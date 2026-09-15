const { randomUUID } = require('node:crypto')
function buildOrder(payload, menu, catalog = {}) {
  const fail = (message) => { throw Object.assign(new Error(message), { statusCode: 400 }) }
  if (!payload || typeof payload !== 'object') fail('Invalid order')
  const { customer, items, meta = {} } = payload
  if (!Array.isArray(items) || !items.length || items.length > 100) fail('Add between 1 and 100 items')
  if (typeof customer?.name !== 'string' || !customer.name.trim() || !/^[+\d\s()-]{10,20}$/.test(customer.phone || '')) fail('Enter a name and valid phone number')
  if (!['delivery', 'pickup'].includes(meta.orderType)) fail('Choose delivery or pickup')
  if (meta.orderType === 'delivery' && (typeof customer.address !== 'string' || !customer.address.trim())) fail('Delivery address is required')
  const customerLocation = payload.customerLocation
  if (customerLocation && (!Number.isFinite(customerLocation.lat) || customerLocation.lat < -90 || customerLocation.lat > 90 || !Number.isFinite(customerLocation.lng) || customerLocation.lng < -180 || customerLocation.lng > 180)) fail('Invalid customer location')
  if (meta.payment && !['cod', 'online'].includes(meta.payment)) fail('Invalid payment method')
  const settings = catalog.restaurantSettings || {}
  if (settings.online_ordering_enabled === false) fail('Online ordering is paused. Please call the restaurant.')
  if (meta.orderType === 'delivery' && settings.delivery_available === false) fail('Delivery is unavailable. Choose pickup.')
  if (meta.orderType === 'pickup' && settings.pickup_available === false) fail('Pickup is unavailable. Choose delivery.')
  const snapshot = items.map((item) => {
    if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) fail('Quantity must be between 1 and 99')
    const canonical = menu.find((entry) => entry.id === (item.productId || item.id))
    if (canonical?.deleted_at || canonical?.available_from && Date.parse(canonical.available_from)>Date.now() || canonical?.available_until && Date.parse(canonical.available_until)<=Date.now()) fail('An item is no longer available')
    if (!canonical || canonical.is_available === false || (catalog.categories && !catalog.categories.some(category => category.id === canonical.category_id && category.is_active))) fail('An item is no longer available')
    const variant = item.selectedVariant && canonical.price_variants?.find((entry) => entry.label === item.selectedVariant)
    if (item.selectedVariant && !variant) fail('Invalid item size')
    if (item.selectedAddons && !Array.isArray(item.selectedAddons)) fail('Invalid add-ons')
    const addons = (item.selectedAddons || []).map((addon) => {
      const match = canonical.addons?.find((entry) => entry.id === addon.id)
      if (!match) fail('An add-on is no longer available')
      return match
    })
    const price = Number(variant ? variant.price : canonical.price) + addons.reduce((sum, addon) => sum + Number(addon.price), 0)
    if (!Number.isFinite(price) || price < 0) fail('Item price is unavailable')
    return { id: item.id, productId: canonical.id, name: canonical.name + (variant ? ` (${variant.label})` : ''), price, quantity: item.quantity, selectedVariant: variant?.label, selectedAddons: addons }
  })
  const subtotal = Number(snapshot.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2))
  for (const id of new Set(snapshot.map(item=>item.productId))) {
    const product=menu.find(item=>item.id===id)
    const requested=snapshot.filter(item=>item.productId===id).reduce((sum,item)=>sum+item.quantity,0)
    if (product.stock_quantity !== undefined && requested>product.stock_quantity) fail('Not enough stock for '+product.name)
  }
  const code = String(meta.coupon || '').trim().toUpperCase()
  if (subtotal < (settings.min_order_value || 0)) fail('The minimum order is ₹' + settings.min_order_value)
  const defaults = [{ code: 'CRAVE50', type: 'fixed', value: 50, minimum: 0, active: true }, { code: 'LOYAL10', type: 'percentage', value: 10, minimum: 0, active: true }, { code: 'NEWUSER15', type: 'percentage', value: 15, minimum: 0, active: true }, { code: 'SAVE20', type: 'fixed', value: 20, minimum: 0, active: true }]
  const rules = Object.fromEntries((catalog.coupons || defaults).filter(c => c.active && subtotal >= c.minimum).map(c => [c.code, c.type === 'percentage' ? subtotal * c.value / 100 : c.value]))
  if (code && !Object.hasOwn(rules, code)) fail('Invalid coupon code')
  const discount = Number(Math.min(subtotal, rules[code] || 0).toFixed(2))
  const delivery = meta.orderType === 'pickup' || subtotal > (settings.free_delivery_above ?? 500) ? 0 : (settings.delivery_fee ?? 40)
  const tax = Number(((subtotal - discount) * (settings.tax_percentage ?? 5) / 100).toFixed(2))
  return { id: `CP-${randomUUID()}`, customer, customerLocation: customerLocation ? { lat: Number(customerLocation.lat), lng: Number(customerLocation.lng) } : null, items: snapshot, subtotal, discount, delivery, tax, total: Number((subtotal - discount + delivery + tax).toFixed(2)), meta: { orderType: meta.orderType, payment: meta.payment || 'cod', coupon: code }, payment_status: 'pending', preparation_minutes: settings.preparation_minutes || 30, status: meta.payment === 'online' ? 'awaiting_payment' : 'placed', created_at: new Date().toISOString() }
}
module.exports = { buildOrder }
