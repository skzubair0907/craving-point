const { configured, rest } = require('./repository.cjs')
async function health({ ready = configured, query = rest } = {}) {
  try {
    if (!ready()) throw new Error('not configured')
    await query('storefront?select=id&limit=1')
    return { statusCode: 200, headers: { 'Content-Type':'application/json', 'Cache-Control':'no-store' }, body: JSON.stringify({status:'ok'}) }
  } catch {
    return { statusCode: 503, headers: { 'Content-Type':'application/json', 'Cache-Control':'no-store' }, body: JSON.stringify({status:'unavailable'}) }
  }
}
module.exports={health}
