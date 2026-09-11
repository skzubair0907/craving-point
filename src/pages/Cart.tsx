import { productMedia } from '../lib/productMedia'
import { useRestaurantData } from '../store/useRestaurantData'
import React, { useState } from 'react'
import { useCartStore } from '../store/useCartStore'
import { Trash2, Plus, Minus, ArrowLeft, CreditCard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'

const CartPage = () => {
  const { coupons, restaurantSettings } = useRestaurantData()
  const {
    items,
    removeItem,
    updateQuantity,
    getTotal,
    clearCart,
    loyaltyPoints,
    rewardApplied,
    setRewardApplied,
    getDeliveryFee,
    getTax,
    getRewardDiscount,
    setCoupon: setAppliedCoupon,
    getCouponDiscount,
  } = useCartStore()
  const [coupon, setCoupon] = useState('')
  const [couponMessage, setCouponMessage] = useState('')

  const subtotal = getTotal()
  const deliveryFee = getDeliveryFee(subtotal)
  const rewardDiscount = rewardApplied ? getRewardDiscount(subtotal) : 0
  const couponDiscount = getCouponDiscount(subtotal)
  const taxableSubtotal = Math.max(0, subtotal - couponDiscount - rewardDiscount)
  const tax = getTax(taxableSubtotal)
  const grandTotal = subtotal - couponDiscount - rewardDiscount + deliveryFee + tax

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase()

    const matched = coupons.find(c => c.code === code && c.active && subtotal >= c.minimum)
    const nextDiscount = matched ? matched.value : 0

    if (nextDiscount > 0) {
      setAppliedCoupon(code)
      setCouponMessage('Coupon applied successfully!')
    } else {
      setAppliedCoupon('')
      setCouponMessage('Invalid coupon code')
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-8xl mb-8">🛒</div>
        <h2 className="text-3xl font-black text-accent mb-4">Your cart is empty</h2>
        <p className="text-accent/60 mb-10 text-lg">Looks like you haven't added anything yet.</p>
        <Link to="/menu" className="btn-primary inline-block">Explore Menu</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-accent">Your Order</h1>
          <button onClick={clearCart} className="text-sm font-bold text-primary hover:underline">Clear All</button>
        </div>

        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="card-premium p-4 flex items-center gap-4"
            >
              <img src={productMedia({ ...item, id: item.productId || item.id }) || '/images/logo.jpg'} alt={productMedia({ ...item, id: item.productId || item.id }) ? item.name : 'Craving Point logo'} className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-xl" />
              <div className="flex-grow">
                <h3 className="font-bold text-accent">{item.name}</h3>
                <p className="text-sm text-accent/60 mb-2">₹{item.price}</p>
                <div className="flex items-center space-x-3">
                  <button 
                    aria-label={`Decrease ${item.name} quantity`}
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="p-1 bg-secondary-dark rounded-md hover:bg-secondary-dark/80"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold">{item.quantity}</span>
                  <button 
                    aria-label={`Increase ${item.name} quantity`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 bg-secondary-dark rounded-md hover:bg-secondary-dark/80"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-accent mb-2">₹{item.price * item.quantity}</p>
                <button 
                  aria-label={`Remove ${item.name}`}
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="card-premium p-6 sticky top-24">
          <h2 className="text-xl font-black text-accent mb-6">Order Summary</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-accent/70">
              <span>Subtotal</span>
              <span className="font-bold">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-accent/70">
              <span>Delivery Fee</span>
              <span className="font-bold">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-accent/70">
              <span>Taxes ({restaurantSettings.tax_percentage ?? 5}%)</span>
              <span className="font-bold">₹{tax.toFixed(2)}</span>
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
            <div className="border-t border-secondary-dark pt-4 flex justify-between text-2xl font-black text-accent">
              <span>Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-8">
            <input 
              type="text" 
              placeholder="Coupon code" 
              aria-label="Coupon code"
              className="min-w-0 flex-grow px-4 py-2 rounded-lg border border-secondary-dark outline-none focus:ring-2 focus:ring-primary"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <button 
              onClick={applyCoupon}
              className="bg-accent text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-accent/90"
            >
              Apply
            </button>
          </div>

          <p role="status" className="mb-3 text-sm">{couponMessage}</p>
          <div className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-accent/60">
            Available codes: {coupons.filter(c => c.active).map(c => c.code).join(' · ')}</div>

          <Link to="/checkout" className="btn-primary w-full flex items-center justify-center space-x-2 text-lg py-4">
            <span>Proceed to Checkout</span>
            <CreditCard size={20} />
          </Link>
          
          <Link to="/menu" className="block text-center mt-4 text-sm font-bold text-accent/60 hover:text-accent transition-colors">
            <div className="flex items-center justify-center space-x-2">
              <ArrowLeft size={16} /> <span>Continue Shopping</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CartPage