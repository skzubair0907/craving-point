import { productMedia } from '../lib/productMedia'
import { useRestaurantData } from '../store/useRestaurantData'
import React, { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, X } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useUIStore } from '../store/useUIStore'
import { useFocusTrap } from '../lib/focusTrap'

const CartDrawer: React.FC = () => {
  useRestaurantData()
  const { items, updateQuantity, removeItem, getTotal, getDeliveryFee, getTax, getRewardDiscount, getCouponDiscount, clearCart } = useCartStore()
  const { isCartOpen, setCartOpen } = useUIStore()
  const drawerRef = useRef<HTMLElement | null>(null)
  const location = useLocation()
  useEffect(() => { setCartOpen(false) }, [location.key, setCartOpen])

  useFocusTrap(drawerRef, isCartOpen, () => setCartOpen(false))

  const subtotal = getTotal()
  const delivery = getDeliveryFee(subtotal)
  const discount = getCouponDiscount(subtotal)
  const tax = getTax(subtotal - discount)
  const reward = getRewardDiscount(subtotal)
  const total = Number((subtotal + delivery + tax - reward - discount).toFixed(2))

  return (
    <>
      {isCartOpen && <motion.div key="cart-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[75] bg-black/60" onClick={() => setCartOpen(false)} aria-hidden="true" />}
      {isCartOpen && (
        <motion.aside
          key="cart-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
          className="fixed right-0 top-0 z-[80] h-dvh overflow-y-auto w-full max-w-md bg-[var(--brand-bg-strong)] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
          ref={drawerRef as any}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart />
              <h3 className="text-lg font-black">Your Order</h3>
            </div>
            <button onClick={() => setCartOpen(false)} aria-label="Close cart">
              <X />
            </button>
          </div>

          <div className="p-4">
            {items.length === 0 && <div className="py-12 text-center text-white/60">Your cart is empty</div>}

            {items.map((it) => (
              <div key={it.id} className="mb-4 flex items-center gap-3">
                <img src={productMedia({ ...it, id: it.productId || it.id }) || '/images/logo-generated.svg'} alt={productMedia({ ...it, id: it.productId || it.id }) ? it.name : 'Craving Point logo'} className="h-16 w-16 rounded-md object-cover" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white">{it.name}</div>
                    <div className="text-white/70">₹{it.price * it.quantity}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => updateQuantity(it.id, it.quantity - 1)} className="btn-ghost">-</button>
                    <div className="px-3 text-white">{it.quantity}</div>
                    <button onClick={() => updateQuantity(it.id, it.quantity + 1)} className="btn-ghost">+</button>
                    <button onClick={() => removeItem(it.id)} className="ml-auto text-sm text-white/70">Remove</button>
                  </div>
                </div>
              </div>
            ))}

            {items.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-white/70"> <span>Subtotal</span> <span>₹{subtotal}</span></div>
                <div className="flex items-center justify-between text-white/70"> <span>Delivery</span> <span>₹{delivery}</span></div>
                <div className="flex items-center justify-between text-white/70"> <span>Tax</span> <span>₹{tax}</span></div>
                {discount > 0 && <div className="flex justify-between"><span>Coupon</span><span>-₹{discount.toFixed(2)}</span></div>}
                {reward > 0 && <div className="flex items-center justify-between text-white/70"> <span>Reward</span> <span>-₹{reward}</span></div>}
                <div className="flex items-center justify-between text-xl font-black"> <span>Total</span> <span>₹{total}</span></div>

                <div className="mt-4 flex gap-3">
                  <Link to="/checkout" onClick={() => setCartOpen(false)} className="btn-primary flex-1">Checkout</Link>
                  <button onClick={() => { clearCart(); setCartOpen(false) }} className="btn-ghost">Clear</button>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </>
  )
}

export default CartDrawer

