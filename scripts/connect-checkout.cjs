const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/store/useRestaurantData.ts',s=>s.replace("        if (data) set({ catalog: { ...defaultCatalog, ...data.data }, revision: data.revision, error: '' })", "        const reviewResult = await supabase.from('published_reviews').select('*').order('created_at', { ascending: false }).limit(30)\n        const reviews = (reviewResult.data || []).map((r: any) => ({ ...r, date: r.created_at }))\n        if (data) set({ catalog: { ...defaultCatalog, ...data.data, reviews }, revision: data.revision, error: '' })").replace("else set({ error: '' })", "else set({ catalog: { ...defaultCatalog, reviews }, error: '' })"));
edit('src/store/useCartStore.ts',s=>s.replace("import { CartItem }", "import { useRestaurantStore } from './useRestaurantData'\nimport { CartItem }").replace(/    const rules: Record<string, number> = \{[^\n]+\}\n    return Number\(Math.min\(subtotal, rules\[get\(\).coupon\] \|\| 0\).toFixed\(2\)\)/, "    const coupon = useRestaurantStore.getState().catalog.coupons.find(c => c.code === get().coupon && c.active && subtotal >= c.minimum)\n    return coupon ? Number(Math.min(subtotal, coupon.type === 'percentage' ? subtotal * coupon.value / 100 : coupon.value).toFixed(2)) : 0").replace('getDeliveryFee: (subtotal) => (subtotal > 500 ? 0 : 40)', 'getDeliveryFee: (subtotal) => { const s = useRestaurantStore.getState().catalog.restaurantSettings; return subtotal > s.free_delivery_above ? 0 : s.delivery_fee }').replace('getTax: (subtotal) => Number((subtotal * 0.05).toFixed(2))', 'getTax: (subtotal) => Number((subtotal * (useRestaurantStore.getState().catalog.restaurantSettings.tax_percentage ?? 5) / 100).toFixed(2))'));
edit('src/pages/Cart.tsx',s=>s.replace("import React,", "import { useRestaurantData } from '../store/useRestaurantData'\nimport React,").replace('const CartPage = () => {','const CartPage = () => {\n  const { coupons, restaurantSettings } = useRestaurantData()').replace(/    const rules: Record<string, number> = \{[\s\S]*?    const nextDiscount = rules\[code\] \?\? 0/, "    const matched = coupons.find(c => c.code === code && c.active && subtotal >= c.minimum)\n    const nextDiscount = matched ? matched.value : 0").replace('Taxes (5%)','Taxes ({restaurantSettings.tax_percentage ?? 5}%)').replace(/          <div className="mb-6 rounded-2xl border border-primary\/20[\s\S]*?          <div className="flex gap-2 mb-8">/, '          <div className="flex gap-2 mb-8">').replace(/valid codes: CRAVE50[^<]+/,'Available codes: {coupons.filter(c => c.active).map(c => c.code).join(\' · \')}'));
edit('src/components/CartDrawer.tsx',s=>s.replace("import React,", "import { useRestaurantData } from '../store/useRestaurantData'\nimport React,").replace('const CartDrawer: React.FC = () => {','const CartDrawer: React.FC = () => {\n  useRestaurantData()'));
edit('api/service.cjs',s=>s.replace("  if (action === 'createOrder')", "  if (action === 'paymentConfig') return { onlineAvailable: payments.available() && (configured() || local) }\n  if (action === 'createOrder')"));
edit('api/server.cjs',s=>s.replace("'/api/orderStatus': 'orderStatus'", "'/api/paymentConfig': 'paymentConfig', '/api/orderStatus': 'orderStatus'"));
fs.writeFileSync('netlify/functions/paymentConfig.js', "import response from './_response.cjs'\nexport const handler = response.endpoint('paymentConfig')\n");
const p='src/pages/Checkout.tsx';let s=fs.readFileSync(p,'utf8');s=s.replace("import React, { useState }", "import React, { useState, useRef, useEffect }").replace("import OrderPreviewModal", "import { useRestaurantData } from '../store/useRestaurantData'\nimport { orderApi, openPayment, saveReceipt } from '../lib/orderApi'\nimport OrderPreviewModal");s=s.replace('  const navigate = useNavigate()', `  const navigate = useNavigate()
  const { restaurantSettings } = useRestaurantData()
  const requestRef = useRef({ id: crypto.randomUUID(), fingerprint: '' })
  const processingRef = useRef(false)
  const [payment, setPayment] = useState('cod')
  const [onlineAvailable, setOnlineAvailable] = useState(false)
  useEffect(() => { orderApi('paymentConfig', {}).then(result => setOnlineAvailable(result.onlineAvailable)).catch(() => setOnlineAvailable(false)) }, [])`);
s=s.replace("useState<'delivery' | 'pickup'>('delivery')", "useState<'delivery' | 'pickup'>(restaurantSettings.delivery_available === false ? 'pickup' : 'delivery')");
const start=s.indexOf('  const handlePlaceOrder =');const end=s.indexOf('\n  return (\n    <div className="max-w-5xl',start);
s=s.slice(0,start)+`  const complete = async (payload: any, expectedTotal: number) => {
    const fingerprint = JSON.stringify(payload)
    if (requestRef.current.fingerprint !== fingerprint) requestRef.current = { id: crypto.randomUUID(), fingerprint }
    const result = await orderApi('createOrder', { ...payload, requestId: requestRef.current.id, expectedTotal })
    if (result.requiresReview) { setPreviewOrder(result.order); setIsPreviewOpen(true); return }
    let order = result.order
    saveReceipt(order)
    if (result.payment) {
      try {
        const confirmation = await openPayment(result.payment, payload.customer)
        const verified = await orderApi('verifyPayment', { orderId: order.id, token: order.trackingToken, paymentId: confirmation.razorpay_payment_id, signature: confirmation.razorpay_signature })
        order = verified.order
        saveReceipt(order)
      } catch (paymentError) {
        navigate('/order-confirmation', { state: { order, retry: { payload, requestId: requestRef.current.id }, paymentError: paymentError instanceof Error ? paymentError.message : 'Payment is awaiting confirmation.' } })
        return
      }
    }
    clearCart()
    navigate('/order-confirmation', { state: { order, clientTotal: total } })
  }
  const run = async (work: () => Promise<void>) => {
    if (processingRef.current) return
    processingRef.current = true; setIsProcessing(true); setError('')
    try { await work() } catch (error) { setError(error instanceof Error ? error.message : 'Unable to place order.') }
    finally { processingRef.current = false; setIsProcessing(false) }
  }
  const handlePlaceOrder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const customer = Object.fromEntries(['name','phone','email','address','landmark','instructions'].map(key => [key, String(data.get(key) || '').trim()]))
    const payload = { customer, items, meta: { orderType, coupon, payment } }
    setPendingPayload(payload)
    void run(async () => {
      const result = await orderApi('createOrder', { ...payload, meta: { ...payload.meta, preview: true } })
      setOnlineAvailable(result.onlineAvailable)
      setPreviewOrder(result.order)
      if (Math.round(result.order.total * 100) !== Math.round(total * 100)) setIsPreviewOpen(true)
      else await complete(payload, result.order.total)
    })
  }
`+s.slice(end);
s=s.replace('onClick={() => setOrderType(\'delivery\')}', "disabled={restaurantSettings.delivery_available === false}\n                onClick={() => setOrderType('delivery')}").replace('onClick={() => setOrderType(\'pickup\')}', "disabled={restaurantSettings.pickup_available === false}\n                onClick={() => setOrderType('pickup')}");
s=s.replace('value="cod" defaultChecked', 'value="cod" checked={payment === \'cod\'} onChange={() => setPayment(\'cod\')}').replace('value="online" disabled', 'value="online" checked={payment === \'online\'} onChange={() => setPayment(\'online\')} disabled={!onlineAvailable}').replace('Online Payment (unavailable)', "{onlineAvailable ? 'Pay securely online' : 'Online payment unavailable'}").replace('disabled={isProcessing}', 'disabled={isProcessing || !restaurantSettings.online_ordering_enabled}').replace('Taxes (5%)', 'Taxes ({restaurantSettings.tax_percentage ?? 5}%)');
s=s.replace(/          onConfirm=\{async \(\) => \{[\s\S]*?\n          \}\}/, `          onConfirm={() => { setIsPreviewOpen(false); if (pendingPayload) void run(() => complete(pendingPayload, previewOrder.total)) }}`);
s=s.replace('      <h1 className="text-3xl', '      {!restaurantSettings.online_ordering_enabled && <p role="alert" className="mb-5">Online ordering is paused. Please call or message the restaurant.</p>}\n      <h1 className="text-3xl');
fs.writeFileSync(p,s);
