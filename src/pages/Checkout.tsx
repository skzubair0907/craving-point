import { randomId } from '../lib/randomId'
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, MapPin, User, ShoppingBag, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '../store/useCartStore'
import { useRestaurantData } from '../store/useRestaurantData'
import { orderApi, openPayment, saveReceipt } from '../lib/orderApi'
import OrderPreviewModal from '../components/OrderPreviewModal'
import { useNotificationsStore } from '../store/useNotificationsStore'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const { restaurantSettings } = useRestaurantData()
  const { add: addNotification } = useNotificationsStore()
  const requestRef = useRef({ id: randomId(), fingerprint: '' })
  const processingRef = useRef(false)
  const [payment, setPayment] = useState('cod')
  const [onlineAvailable, setOnlineAvailable] = useState(false)
  useEffect(() => { orderApi('paymentConfig', {}).then(result => setOnlineAvailable(result.onlineAvailable)).catch(() => setOnlineAvailable(false)) }, [])
  const {
    items,
    coupon,
    getCouponDiscount,
    getTotal,
    getDeliveryFee,
    getTax,
    getRewardDiscount,
    rewardApplied,
    loyaltyPoints,
    addLoyaltyPoints,
    clearCart,
    setRewardApplied,
  } = useCartStore()
  const [pendingPayload, setPendingPayload] = useState<any>(null)
  const [profile] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('craving-point-profile') || '{}') || {} } catch { return {} } })
  const [error, setError] = useState('')
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>(restaurantSettings.delivery_available === false ? 'pickup' : 'delivery')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewOrder, setPreviewOrder] = useState<any | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [customerLocation, setCustomerLocation] = useState<{lat:number;lng:number}|null>(()=>{try{const saved=JSON.parse(localStorage.getItem('craving-point-current-location')||'null');return saved&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lng)?{lat:saved.lat,lng:saved.lng}:null}catch{return null}})
  const [locationMessage, setLocationMessage] = useState('')
  const [address, setAddress] = useState(profile.address || '')

  useEffect(()=>{const update=(event:Event)=>{const location=(event as CustomEvent).detail;if(location?.lat&&location?.lng)setCustomerLocation({lat:location.lat,lng:location.lng})};window.addEventListener('craving-point-location',update);return()=>window.removeEventListener('craving-point-location',update)},[])

  const subtotal = getTotal()
  const couponDiscount = getCouponDiscount(subtotal)
  const rewardDiscount = rewardApplied ? getRewardDiscount(subtotal) : 0
  const taxableSubtotal = Math.max(0, subtotal - couponDiscount - rewardDiscount)
  const deliveryFee = orderType === 'pickup' ? 0 : getDeliveryFee(subtotal)
  const tax = getTax(taxableSubtotal)
  const total = subtotal - couponDiscount - rewardDiscount + deliveryFee + tax

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        {!restaurantSettings.online_ordering_enabled && <p role="alert" className="mb-5">Online ordering is paused. Please call or message the restaurant.</p>}
      <h1 className="text-3xl font-black text-accent">Your cart is empty</h1>
        <p className="mt-4 text-accent/60">Add items before completing checkout.</p>
      </div>
    )
  }

  const complete = async (payload: any, expectedTotal: number) => {
    const fingerprint = JSON.stringify(payload)
    if (requestRef.current.fingerprint !== fingerprint) requestRef.current = { id: randomId(), fingerprint }
    const result = await orderApi('createOrder', { ...payload, requestId: requestRef.current.id, expectedTotal })
    if (result.requiresReview) { setPreviewOrder(result.order); setIsPreviewOpen(true); return }
    let order = { ...result.order, payment: result.payment }
    saveReceipt(order)
    addNotification({
      id: `order-${order.id}`,
      title: 'Order confirmed',
      message: `We received your order ${order.id}. Track it anytime from the account page.`,
    })
    addLoyaltyPoints(Math.max(10, Math.round(order.total)))
    setRewardApplied(false)
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
    const payload = { customer, customerLocation: orderType === 'delivery' ? customerLocation : null, items, meta: { orderType, coupon, payment } }
    setPendingPayload(payload)
    void run(async () => {
      const result = await orderApi('createOrder', { ...payload, meta: { ...payload.meta, preview: true } })
      setOnlineAvailable(result.onlineAvailable)
      setPreviewOrder(result.order)
      if (Math.round(result.order.total * 100) !== Math.round(total * 100)) setIsPreviewOpen(true)
      else await complete(payload, result.order.total)
    })
  }

  return (
    <div className="checkout-page max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-accent mb-10 text-center">Complete Your Order</h1><p role="status" className="mb-6">{restaurantSettings.online_ordering_enabled ? `Estimated preparation: ${restaurantSettings.preparation_minutes || 30} minutes. Delivery time is additional.` : 'Ordering is temporarily paused. Please call the restaurant or try again later.'}</p>
      
      <div className="checkout-page-grid grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handlePlaceOrder} className="space-y-8">
            {/* Order Type */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                disabled={restaurantSettings.delivery_available === false}
                onClick={() => setOrderType('delivery')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${orderType === 'delivery' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-secondary-dark bg-[var(--brand-surface-2)]'}`}
              >
                <MapPin className={orderType === 'delivery' ? 'text-primary' : 'text-accent/40'} />
                <span className={`font-bold ${orderType === 'delivery' ? 'text-primary' : 'text-accent'}`}>Home Delivery</span>
              </button>
              <button 
                type="button"
                disabled={restaurantSettings.pickup_available === false}
                onClick={() => setOrderType('pickup')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${orderType === 'pickup' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-secondary-dark bg-[var(--brand-surface-2)]'}`}
              >
                <ShoppingBag className={orderType === 'pickup' ? 'text-primary' : 'text-accent/40'} />
                <span className={`font-bold ${orderType === 'pickup' ? 'text-primary' : 'text-accent'}`}>Self Pickup</span>
              </button>
            </div>

            {/* Customer Details */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-xl font-bold text-accent mb-4 flex items-center gap-2">
                <User size={20} /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-bold text-accent/60">Full Name</label>
                    <input id="name" name="name" defaultValue={profile.name || ''} required type="text" placeholder="Enter your name" className="w-full px-4 py-3 rounded-xl border border-secondary-dark outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-bold text-accent/60">Mobile Number</label>
                    <input id="phone" name="phone" defaultValue={profile.phone || ''} required type="tel" pattern="[+0-9 ()-]{10,20}" autoComplete="tel" placeholder="Enter your mobile number" className="w-full px-4 py-3 rounded-xl border border-secondary-dark outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <label htmlFor="email" className="text-sm font-bold text-accent/60">Email (Optional)</label>
                    <input id="email" name="email" defaultValue={profile.email || ''} type="email" placeholder="email@example.com" className="w-full px-4 py-3 rounded-xl border border-secondary-dark outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            {/* Address Details */}
            {orderType === 'delivery' && (
              <div className="card-premium p-6 space-y-6">
                <h3 className="text-xl font-bold text-accent mb-4 flex items-center gap-2">
                  <MapPin size={20} /> Delivery Address
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                      <label htmlFor="address" className="text-sm font-bold text-accent/60">Full Address</label>
                    {Array.isArray(profile.addresses)&&profile.addresses.length>0&&<select className="mb-3 w-full rounded-xl border border-secondary-dark px-4 py-3" defaultValue="" onChange={event=>{const saved=profile.addresses.find((item:any)=>item.id===event.target.value);if(saved)setAddress(saved.address)}}><option value="">Choose a saved address</option>{profile.addresses.map((item:any)=><option key={item.id} value={item.id}>{item.label} — {item.address}</option>)}</select>}
                    <textarea id="address" name="address" value={address} onChange={event => setAddress(event.target.value)} required rows={3} placeholder="House No, Street, Area..." className="w-full px-4 py-3 rounded-xl border border-secondary-dark outline-none focus:ring-2 focus:ring-primary" />
                    <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-secondary text-sm" onClick={()=>{if(!navigator.geolocation){setLocationMessage('Location is unavailable in this browser.');return}setLocationMessage('Finding your location…');navigator.geolocation.getCurrentPosition(async position=>{const location={lat:position.coords.latitude,lng:position.coords.longitude};setCustomerLocation(location);setLocationMessage('Finding your full address…');try{const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,{headers:{Accept:'application/json'}});const result=await response.json();if(!response.ok||!result.display_name)throw new Error('Address unavailable');setAddress(result.display_name);setLocationMessage('Address filled from your location. Add your flat or house number if it is missing.')}catch{setLocationMessage('Exact delivery location saved. Please enter your full address manually.')}},()=>setLocationMessage('Location permission was denied. Your typed address will still be used.'),{enableHighAccuracy:true,timeout:15000,maximumAge:30000})}}>Use my current location</button>{locationMessage&&<span className="text-sm text-accent/70">{locationMessage}</span>}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="landmark" className="text-sm font-bold text-accent/60">Landmark</label>
                    <input id="landmark" name="landmark" type="text" placeholder="Near Noor Masjid, etc." className="w-full px-4 py-3 rounded-xl border border-secondary-dark outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="instructions" className="text-sm font-bold text-accent/60">Special Instructions</label>
                    <input id="instructions" name="instructions" type="text" placeholder="e.g. Ring bell twice" className="w-full px-4 py-3 rounded-xl border border-secondary-dark outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {orderType === 'pickup' && (
              <div className="card-premium p-6 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-full">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Pickup Location</h3>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      Shop No. 29, F-Sector, Cheeta Camp Road, Near Noor Masjid, Cheeta Camp, Trombay, Mumbai 400088
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="card-premium p-6 space-y-6">
              <h3 className="text-xl font-bold text-accent mb-4 flex items-center gap-2">
                <CreditCard size={20} /> Payment Method
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center p-4 border-2 border-secondary-dark rounded-2xl cursor-pointer hover:bg-secondary-dark transition-all">
                  <input type="radio" name="payment" value="cod" checked={payment === 'cod'} onChange={() => setPayment('cod')} className="w-4 h-4 text-primary" />
                  <span className="ml-3 font-bold text-accent">{orderType === 'pickup' ? 'Pay at Pickup' : 'Cash on Delivery'}</span>
                </label>
                <label className="flex items-center p-4 border-2 border-secondary-dark rounded-2xl cursor-pointer hover:bg-secondary-dark transition-all">
                  <input type="radio" name="payment" value="online" checked={payment === 'online'} onChange={() => setPayment('online')} disabled={!onlineAvailable} className="w-4 h-4 text-primary" />
                  <span className="ml-3 font-bold text-accent">{onlineAvailable ? 'Pay securely online' : 'Online payment unavailable'}</span>
                </label>
              </div>
            </div>

            {error && <p role="alert" className="text-red-400">{error}</p>}
            <button 
              type="submit" 
              disabled={isProcessing || !restaurantSettings.online_ordering_enabled}
              className="btn-primary w-full py-5 text-xl shadow-xl disabled:opacity-50"
            >
              {isProcessing ? 'Processing Order...' : 'Place Order Now'}
            </button>
          </form>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="checkout-summary card-premium p-6 sticky top-24">
            <h2 className="text-xl font-black text-accent mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-accent/70">
                <span>Items Total</span>
                <span className="font-bold">₹{subtotal}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Coupon</span>
                  <span>-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {rewardDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Rewards</span>
                  <span>-₹{rewardDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-accent/70">
                <span>Delivery Fee</span>
                <span className="font-bold">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-accent/70">
                <span>Taxes ({restaurantSettings.tax_percentage ?? 5}%)</span>
                <span className="font-bold">₹{tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-secondary-dark pt-4 flex justify-between text-2xl font-black text-accent">
                <span>Grand Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            {loyaltyPoints > 0 && (
              <button
                type="button"
                onClick={() => setRewardApplied(!rewardApplied)}
                className={`mt-4 w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${rewardApplied ? 'border-primary bg-primary/10 text-primary' : 'border-secondary-dark bg-secondary-dark/40 text-accent'}`}
              >
                {rewardApplied ? '✓ Rewards applied' : 'Use loyalty rewards'}
                <span className="ml-2 opacity-80">({loyaltyPoints} pts)</span>
              </button>
            )}
            <div className="p-4 bg-secondary-dark rounded-xl flex items-start gap-3 text-xs text-accent/60 leading-relaxed">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <span>We ensure the highest standards of hygiene and packaging for every order.</span>
            </div>
          </div>
        </div>
      </div>
        <OrderPreviewModal
          open={isPreviewOpen}
          order={previewOrder}
          clientTotal={total}
          onCancel={() => { setIsPreviewOpen(false); setPreviewOrder(null); setIsProcessing(false) }}
          onConfirm={() => { setIsPreviewOpen(false); if (pendingPayload) void run(() => complete(pendingPayload, previewOrder.total)) }}
        />
      </div>
  )
}

export default CheckoutPage
