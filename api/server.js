const http = require('http')
const fs = require('fs')
const path = require('path')

const ORDERS_PATH = path.join(__dirname, '..', 'data', 'orders.json')
const MENU_PATH = path.join(__dirname, '..', 'data', 'menu.json')

function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), 'utf-8')
}

function generateOrderId() {
  const now = new Date()
  const ts = now.toISOString().replace(/[:.Z-]/g, '')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `CP-${ts}-${rand}`
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/orders') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const { customer, items = [], meta = {} } = payload

        if (!items || !Array.isArray(items) || items.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'items required' }))
          return
        }

        // load canonical menu
        let menu = []
        try { menu = JSON.parse(fs.readFileSync(MENU_PATH, 'utf-8')) } catch (e) { menu = [] }

        // validate and snapshot items server-side
        const snapshotItems = []
        let subtotal = 0

        for (const it of items) {
          const id = it.id || it.item_id || it.productId
          const qty = Number(it.quantity) || 1
          const canonical = menu.find((m) => m.id === id)
          if (!canonical) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `Unknown item id: ${id}` }))
            return
          }
          const price = Number(canonical.price) || 0
          const itemSnap = { id: canonical.id, name: canonical.name, price, quantity: qty }
          snapshotItems.push(itemSnap)
          subtotal += price * qty
        }

        const delivery = subtotal > 500 ? 0 : 40
        const tax = Number((subtotal * 0.05).toFixed(2))
        const total = Number((subtotal + delivery + tax).toFixed(2))

        const order = {
          id: generateOrderId(),
          customer: customer || null,
          items: snapshotItems,
          subtotal,
          delivery,
          tax,
          total,
          meta,
          status: 'ORDER_PLACED',
          created_at: new Date().toISOString(),
        }

        // If preview/dry-run requested, return snapshot without persisting
        if (meta && meta.preview) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, order, preview: true }))
          return
        }

        const orders = readOrders()
        orders.unshift(order)
        writeOrders(orders)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, order }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

const PORT = process.env.API_PORT || 8787
server.listen(PORT, () => console.log(`Local API listening on http://localhost:${PORT}`))
