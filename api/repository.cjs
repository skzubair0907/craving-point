let fs = null
let nodePath = null

try {
  fs = require('node:fs')
  nodePath = require('node:path')
} catch {
  fs = null
  nodePath = null
}

const root = nodePath ? nodePath.resolve('.') : '.'

const dataFile = fileName => {
  if (!nodePath) return null
  const explicit = process.env.LOCAL_ORDERS_PATH
  if (explicit) return explicit
  return nodePath.resolve(root, 'data', fileName)
}

const localStorage = () => {
  if (!fs || !nodePath) return null
  return {
    existsSync: fs.existsSync.bind(fs),
    readFileSync: fs.readFileSync.bind(fs),
    writeFileSync: fs.writeFileSync.bind(fs),
    renameSync: fs.renameSync.bind(fs),
  }
}

const configured = () => {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && Boolean(key) && !/^(your_|placeholder|copy[-_ ]|example|replace[-_ ])/i.test(key)
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
  const storage = localStorage()
  const ordersPath = dataFile('orders.json')
  const read = () => {
    if (!storage || !ordersPath) return []
    return storage.existsSync(ordersPath) ? JSON.parse(storage.readFileSync(ordersPath, 'utf8')) : []
  }
  const write = rows => {
    if (!storage || !ordersPath) throw Object.assign(new Error('Local file storage is unavailable in this environment.'), { statusCode: 503 })
    storage.writeFileSync(ordersPath + '.tmp', JSON.stringify(rows, null, 2))
    storage.renameSync(ordersPath + '.tmp', ordersPath)
  }
  return {
    async catalog() {
      if (!configured() && process.env.VITE_SUPABASE_URL) throw Object.assign(new Error('Order database setup is incomplete. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server, then restart it.'), { statusCode: 503 })
      // Local development can run without Supabase. Production never needs this
      // file fallback, which keeps deployed server requests independent of disk.
      if (!configured()) {
        const catalogPath = dataFile('catalog.json')
        if (!storage || !catalogPath || !storage.existsSync(catalogPath)) {
          throw Object.assign(new Error('The restaurant catalog is not available in this environment.'), { statusCode: 503 })
        }
        return JSON.parse(storage.readFileSync(catalogPath, 'utf8'))
      }
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
    async deliveryLocation(orderNumber) {
      if (local && !configured()) return null
      const rows = await rest(`delivery_tracking?order_number=eq.${encodeURIComponent(orderNumber)}&select=latitude,longitude,accuracy,updated_at&limit=1`)
      return rows[0] || null
    },
    async review(row) {
      if (local && !configured()) throw Object.assign(new Error('Reviews require the connected restaurant database.'), { statusCode: 503 })
      return rest('customer_reviews', { method: 'POST', body: JSON.stringify(row) })
    },
  }
}
module.exports = { repository, configured, rest }
