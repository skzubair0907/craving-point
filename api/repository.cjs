const fs = require('node:fs')
const path = require('node:path')
const root = path.join(__dirname, '..')
const configured = () => {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return /^https:\/\//.test(url) && Boolean(key) && !/^your_|placeholder/i.test(key)
}
async function rest(resource, options = {}) {
  if (!configured()) throw Object.assign(new Error('Online ordering is not configured. Please contact the restaurant.'), { statusCode: 503 })
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${resource}`, {
    ...options,
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...options.headers },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) {
    throw Object.assign(new Error(response.status === 409 ? 'This request was already saved.' : 'The restaurant database is unavailable. Please try again or call.'), { statusCode: response.status === 409 ? 409 : 503 })
  }
  return response.status === 204 ? null : response.json()
}
function repository(local = false) {
  const ordersPath = process.env.LOCAL_ORDERS_PATH || path.join(root, 'data/orders.json')
  const read = () => fs.existsSync(ordersPath) ? JSON.parse(fs.readFileSync(ordersPath, 'utf8')) : []
  const write = rows => { fs.writeFileSync(ordersPath + '.tmp', JSON.stringify(rows, null, 2)); fs.renameSync(ordersPath + '.tmp', ordersPath) }
  return {
    async catalog() {
      if (!configured() && process.env.VITE_SUPABASE_URL) throw Object.assign(new Error('Order database setup is incomplete. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server, then restart it.'), { statusCode: 503 })
      const fallback = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'))
      if (!configured()) return fallback
      const rows = await rest('storefront?id=eq.1&select=data')
      if (!rows[0]?.data) throw Object.assign(new Error('The restaurant catalog has not been initialized.'), { statusCode: 503 })
      const stocks = await rest('product_stock?select=product_id,quantity')
      const catalog = rows[0].data
      catalog.menuItems = catalog.menuItems.map(item => { const stock = stocks.find(s => s.product_id === item.id); return stock ? { ...item, stock_quantity: stock.quantity } : item })
      return catalog
    },
    async find(field, value) {
      if (local && !configured()) return read().find(row => row[field] === value) || null
      return (await rest(`order_requests?${field}=eq.${encodeURIComponent(value)}&select=*&limit=1`))[0] || null
    },
    async insert(row) {
      if (local && !configured()) {
        const rows = read()
        if (rows.some(entry => entry.request_id === row.request_id)) throw Object.assign(new Error('Request already saved'), { statusCode: 409 })
        rows.unshift(row); write(rows); return row
      }
      return (await rest('order_requests', { method: 'POST', body: JSON.stringify(row) }))[0]
    },
    async payment(row, paymentId) {
      if (local && !configured()) {
        const rows = read(); const current = rows.find(entry => entry.order_number === row.order_number)
        current.payment_id = paymentId; current.payload.payment_status = 'paid'
        if (current.payload.status === 'awaiting_payment') current.payload.status = 'placed'
        write(rows); return current
      }
      return await rest('rpc/confirm_order_payment', { method: 'POST', body: JSON.stringify({ p_order_number: row.order_number, p_payment_id: paymentId }) })
    },
    async review(row) {
      if (local && !configured()) throw Object.assign(new Error('Reviews require the connected restaurant database.'), { statusCode: 503 })
      return rest('customer_reviews', { method: 'POST', body: JSON.stringify(row) })
    },
  }
}
module.exports = { repository, configured, rest }
