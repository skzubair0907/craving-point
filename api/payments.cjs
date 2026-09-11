const { createHmac, timingSafeEqual } = require('node:crypto')
const available = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const signature = (text, secret) => createHmac('sha256', secret).update(text).digest('hex')
async function razorpay(resource, body) {
  if (!available()) throw Object.assign(new Error('Online payment is not available. Choose payment on delivery or pickup.'), { statusCode: 503 })
  const res = await fetch(`https://api.razorpay.com/v1/${resource}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw Object.assign(new Error('The payment provider is unavailable. Please retry.'), { statusCode: 502 })
  return res.json()
}
const validPayment = (payment, row) => payment.order_id === row.payment_order_id && payment.status === 'captured' && payment.currency === 'INR' && payment.amount === Math.round(row.payload.total * 100)
module.exports = { available, equal, signature, razorpay, validPayment }
