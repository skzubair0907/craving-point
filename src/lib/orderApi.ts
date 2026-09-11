export async function orderApi(action: string, payload: unknown) {
  const endpoint = import.meta.env.DEV ? `/api/${action}` : `/.netlify/functions/${action}`
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) })
  let data
  try { data = await response.json() } catch { throw new Error('The order service is unavailable. Please call the restaurant.') }
  if (!response.ok) throw new Error(data.error || 'Unable to complete this request.')
  return data
}
export function saveReceipt(order: any) {
  try { localStorage.setItem('craving-point-last-order', JSON.stringify(order)); let history; try { history=JSON.parse(localStorage.getItem('craving-point-order-history')||'[]') } catch { history=[] }; if(!Array.isArray(history))history=[]; localStorage.setItem('craving-point-order-history',JSON.stringify([order,...history.filter((entry:any)=>entry?.id!==order.id)].slice(0,20))) } catch { /* Navigation also retains the receipt. */ }
}
let checkoutScript: Promise<void> | undefined
export async function openPayment(payment: any, customer: any): Promise<any> {
  if (!(window as any).Razorpay) {
    if (!checkoutScript) checkoutScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      script.onerror = () => { checkoutScript = undefined; script.remove(); reject(new Error('Unable to load secure checkout. Your order is awaiting payment.')) }
      document.head.appendChild(script)
    })
    await checkoutScript
  }
  return new Promise((resolve, reject) => {
    const checkout = new (window as any).Razorpay({ ...payment, name: 'Craving Point', description: 'Food order', prefill: { name: customer.name, email: customer.email, contact: customer.phone }, handler: resolve, modal: { ondismiss: () => reject(new Error('Payment was not completed. You can retry from your order receipt.')) }, theme: { color: '#f15a29' } })
    checkout.on('payment.failed', () => reject(new Error('Payment did not complete. Your receipt is saved so you can retry.')))
    checkout.open()
  })
}
