import { randomId } from '../lib/randomId'
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, MapPin, User, ShoppingBag, CheckCircle, ArrowLeft, ChevronRight, Minus, Plus, BadgePercent, CircleHelp } from 'lucide-react'
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
  const [showAddressForm, setShowAddressForm] = useState(!profile.address)
  const [showContactForm, setShowContactForm] = useState(!profile.name && !profile.phone)

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
    <div className="checkout-page max-w-5xl mx-auto px-3 pb-24 pt-3 sm:px-4 sm:py-8">
      <header className="checkout-header">
        <button type="button" className="checkout-icon-button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div className="checkout-header__text">
          <h1>Checkout</h1>
          <p>Craving Point • Cheeta Camp</p>
        </div>
        <button type="button" className="checkout-icon-button" aria-label="Help">
          <CircleHelp size={18} />
        </button>
      </header>

      <div className="checkout-progress" aria-label="Checkout progress">
        <span className="is-done">Cart <CheckCircle size={13} /></span>
        <span className="is-current">Delivery <span className="progress-dot" /></span>
        <span>Payment <span className="progress-dot muted" /></span>
      </div>

      <div className="checkout-page-grid grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-4 lg:gap-8">
        <div className="space-y-4">
          <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
            <div className="checkout-card">
              <div className="checkout-selector" role="tablist" aria-label="Delivery or pickup">
                <button
                  type="button"
                  disabled={restaurantSettings.delivery_available === false}
                  onClick={() => setOrderType('delivery')}
                  className={`checkout-type-button ${orderType === 'delivery' ? 'checkout-type-button--active' : ''}`}
                >
                  <MapPin size={17} />
                  <span>Delivery</span>
                </button>
                <button
                  type="button"
                  disabled={restaurantSettings.pickup_available === false}
                  onClick={() => setOrderType('pickup')}
                  className={`checkout-type-button ${orderType === 'pickup' ? 'checkout-type-button--active' : ''}`}
                >
                  <ShoppingBag size={17} />
                  <span>Pickup</span>
                </button>
              </div>

              <div className="checkout-meta-row">
                <span className="checkout-meta-label">Estimated preparation</span>
                <strong>{restaurantSettings.preparation_minutes || 30} min</strong>
                <span>Delivery time may vary.</span>
              </div>
            </div>

            {orderType === 'delivery' ? (
              <div className="checkout-card">
                <div className="checkout-section-header">
                  <span className="checkout-section-icon"><MapPin size={16} /></span>
                  <h3>Delivering to</h3>
                </div>

                {!address || showAddressForm ? (
                  <div className="checkout-address-stack">
                    {!address && (
                      <button type="button" className="checkout-link-button" onClick={() => setShowAddressForm(true)}>
                        <span className="checkout-pill">+ Add delivery address</span>
                      </button>
                    )}

                    {showAddressForm && (
                      <div className="checkout-address-form">
                        <button type="button" className="checkout-ghost-btn checkout-ghost-btn--full" onClick={() => {
                          if (!navigator.geolocation) {
                            setLocationMessage('We could not access your location. Enter your address manually.')
                            return
                          }
                          setLocationMessage('Getting your location...')
                          navigator.geolocation.getCurrentPosition(
                            async (position) => {
                              const location = { lat: position.coords.latitude, lng: position.coords.longitude }
                              setCustomerLocation(location)
                              setLocationMessage('Location detected ✓')
                              try {
                                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`, { headers: { Accept: 'application/json' } })
                                const result = await response.json()
                                if (!response.ok || !result.display_name) throw new Error('Address unavailable')
                                setAddress(result.display_name)
                                setShowAddressForm(false)
                              } catch {
                                setLocationMessage("We couldn't access your location. Enter your address manually.")
                              }
                            },
                            () => {
                              setLocationMessage("We couldn't access your location. Enter your address manually.")
                            },
                            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
                          )
                        }}>
                          Use current location
                        </button>

                        <div className="checkout-field">
                          <label htmlFor="address">Full Address</label>
                          <textarea id="address" name="address" value={address} onChange={(event) => setAddress(event.target.value)} required rows={3} placeholder="House No, Street, Area..." className="checkout-input checkout-textarea" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="checkout-field">
                            <label htmlFor="landmark">Landmark</label>
                            <input id="landmark" name="landmark" type="text" placeholder="Near Noor Masjid, etc." className="checkout-input" />
                          </div>
                          <div className="checkout-field">
                            <label htmlFor="instructions">Delivery instructions</label>
                            <input id="instructions" name="instructions" type="text" placeholder="e.g. Ring bell twice" className="checkout-input" />
                          </div>
                        </div>

                        <div className="checkout-inline-actions">
                          <button type="button" className="checkout-mini-button" onClick={() => setShowAddressForm(false)}>
                            Cancel
                          </button>
                          <button type="button" className="checkout-primary-button" onClick={() => setShowAddressForm(false)}>
                            Save address
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="checkout-address-summary">
                    <input type="hidden" name="address" value={address} />
                    <input type="hidden" name="landmark" value={profile.landmark || ''} />
                    <input type="hidden" name="instructions" value={profile.instructions || ''} />
                    <div className="checkout-address-summary__top">
                      <div className="checkout-address-badge">Home</div>
                      <button type="button" className="checkout-link-button" onClick={() => setShowAddressForm(true)}>Change</button>
                    </div>
                    <p>{address}</p>
                  </div>
                )}

                {locationMessage && <p className="checkout-helper-text checkout-helper-text--inline">{locationMessage}</p>}
              </div>
            ) : (
              <div className="checkout-card">
                <div className="checkout-section-header">
                  <span className="checkout-section-icon"><ShoppingBag size={16} /></span>
                  <h3>Pickup from</h3>
                </div>
                <div className="checkout-pickup-panel">
                  <h4>Craving Point</h4>
                  <p>Shop No. 29, F-Sector, Cheeta Camp Road</p>
                  <p>Near Noor Masjid, Trombay, Mumbai 400088</p>
                </div>
                <button type="button" className="checkout-link-button checkout-link-button--spaced">View on map</button>
              </div>
            )}

            <div className="checkout-card">
              <div className="checkout-section-header">
                <span className="checkout-section-icon"><User size={16} /></span>
                <h3>Contact details</h3>
              </div>

              {!showContactForm ? (
                <div className="checkout-contact-summary">
                  <input type="hidden" name="name" value={profile.name || ''} />
                  <input type="hidden" name="phone" value={profile.phone || ''} />
                  <input type="hidden" name="email" value={profile.email || ''} />
                  <div>
                    <label>Customer</label>
                    <p>{profile.name || 'Your name'}</p>
                  </div>
                  <div>
                    <label>Phone</label>
                    <p>{profile.phone || '+91 ••••• ••469'}</p>
                  </div>
                  <button type="button" className="checkout-link-button" onClick={() => setShowContactForm(true)}>Edit</button>
                </div>
              ) : (
                <div className="checkout-contact-form">
                  <div className="checkout-field">
                    <label htmlFor="name">Customer name</label>
                    <input id="name" name="name" defaultValue={profile.name || ''} required type="text" placeholder="Enter your name" className="checkout-input" />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="phone">Mobile number</label>
                    <div className="checkout-phone-field">
                      <span>+91</span>
                      <input id="phone" name="phone" defaultValue={profile.phone || ''} required type="tel" inputMode="numeric" autoComplete="tel" pattern="[0-9]{10}" placeholder="85912 45469" className="checkout-input" />
                    </div>
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="email">Email (optional)</label>
                    <input id="email" name="email" defaultValue={profile.email || ''} type="email" placeholder="email@example.com" className="checkout-input" />
                  </div>
                  <div className="checkout-inline-actions">
                    <button type="button" className="checkout-mini-button" onClick={() => setShowContactForm(false)}>Cancel</button>
                    <button type="button" className="checkout-primary-button" onClick={() => setShowContactForm(false)}>Save</button>
                  </div>
                </div>
              )}
            </div>

            <div className="checkout-card">
              <div className="checkout-section-header">
                <span className="checkout-section-icon"><ShoppingBag size={16} /></span>
                <h3>Your order</h3>
              </div>

              <div className="checkout-order-list">
                {items.map((item) => (
                  <div key={item.id} className="checkout-order-item">
                    <div className="checkout-order-item__image" aria-hidden="true">
                      {item.name?.slice(0, 1).toUpperCase() || 'I'}
                    </div>
                    <div className="checkout-order-item__details">
                      <div className="checkout-order-item__row">
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.selectedVariant || 'Regular'}</span>
                        </div>
                        <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                      </div>

                      <div className="checkout-order-item__controls">
                        <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => useCartStore.getState().updateQuantity(item.id, item.quantity - 1)}>
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Increase ${item.name}`} onClick={() => useCartStore.getState().updateQuantity(item.id, item.quantity + 1)}>
                          <Plus size={14} />
                        </button>
                        <button type="button" className="checkout-remove-link" onClick={() => useCartStore.getState().removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="checkout-link-button checkout-link-button--spaced" onClick={() => navigate('/menu')}>
                + Add more items
              </button>
            </div>

            <div className="checkout-card checkout-card--compact">
              <div className="checkout-section-header">
                <span className="checkout-section-icon"><BadgePercent size={16} /></span>
                <h3>Apply coupon</h3>
                <button type="button" className="checkout-link-button">View offers</button>
              </div>
            </div>

            <div className="checkout-card">
              <div className="checkout-section-header">
                <span className="checkout-section-icon"><CreditCard size={16} /></span>
                <h3>Payment method</h3>
              </div>

              <div className="checkout-payment-grid">
                <label className={`checkout-payment-option ${payment === 'cod' ? 'checkout-payment-option--selected' : ''}`}>
                  <input type="radio" name="payment" value="cod" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
                  <div>
                    <span className="checkout-payment-title">Cash on Delivery</span>
                    <small>Pay when your order arrives</small>
                  </div>
                </label>

                <label className={`checkout-payment-option ${payment === 'online' ? 'checkout-payment-option--selected' : ''} ${!onlineAvailable ? 'checkout-payment-option--disabled' : ''}`}>
                  <input type="radio" name="payment" value="online" checked={payment === 'online'} onChange={() => setPayment('online')} disabled={!onlineAvailable} />
                  <div>
                    <span className="checkout-payment-title">{onlineAvailable ? 'Online payment' : 'Online payment unavailable'}</span>
                    <small>{onlineAvailable ? 'UPI / Cards / Wallets' : 'Currently unavailable'}</small>
                  </div>
                </label>
              </div>
            </div>

            <div className="checkout-card">
              <div className="checkout-section-header">
                <span className="checkout-section-icon"><CheckCircle size={16} /></span>
                <h3>Bill details</h3>
              </div>

              <div className="checkout-bill">
                <div><span>Item total</span><strong>₹{subtotal}</strong></div>
                <div><span>Delivery fee</span><strong>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</strong></div>
                <div className="checkout-bill__discount"><span>Discount</span><strong>-₹{(couponDiscount + rewardDiscount).toFixed(2)}</strong></div>
                <div><span>Taxes</span><strong>₹{tax.toFixed(2)}</strong></div>
                <div className="checkout-bill__total"><span>Total</span><strong>₹{total.toFixed(2)}</strong></div>
              </div>
            </div>

            {error && <p role="alert" className="checkout-error">{error}</p>}
          </form>
        </div>

        <aside className="checkout-side-panel lg:block hidden">
          <div className="checkout-summary card-premium sticky top-24">
            <h2 className="text-xl font-black text-accent mb-5">Order summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="checkout-summary-line">
                  <span>{item.name}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="checkout-summary-totals mt-5">
              <div><span>Subtotal</span><strong>₹{subtotal}</strong></div>
              <div><span>Delivery</span><strong>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</strong></div>
              {couponDiscount > 0 && <div><span>Coupon</span><strong>-₹{couponDiscount.toFixed(2)}</strong></div>}
              {rewardDiscount > 0 && <div><span>Rewards</span><strong>-₹{rewardDiscount.toFixed(2)}</strong></div>}
              <div className="checkout-summary-totals__grand"><span>To pay</span><strong>₹{total.toFixed(2)}</strong></div>
            </div>
          </div>
        </aside>
      </div>

      <div className="checkout-fixed-bar">
        <div className="checkout-fixed-bar__meta">
          <span className="checkout-fixed-bar__total">₹{total.toFixed(2)}</span>
          <span className="checkout-fixed-bar__label">Total</span>
        </div>
        <button type="submit" form="checkout-form" className="checkout-order-button" disabled={isProcessing || restaurantSettings.online_ordering_enabled === false}>
          {isProcessing ? 'Placing order...' : orderType === 'pickup' ? 'Place pickup order' : onlineAvailable && payment === 'online' ? 'Proceed to pay' : 'Place order'}
          <ChevronRight size={18} />
        </button>
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
