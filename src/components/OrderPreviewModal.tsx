import React, { useRef } from 'react'
import { useFocusTrap } from '../lib/focusTrap'
import { motion } from 'framer-motion'

type OrderItem = { id: string; name: string; price: number; quantity: number }
type OrderRecord = { items: OrderItem[]; subtotal: number; delivery: number; tax: number; total: number }

interface Props {
  open: boolean
  order: OrderRecord | null
  clientTotal: number
  onConfirm: () => void
  onCancel: () => void
}

const OrderPreviewModal: React.FC<Props> = ({ open, order, clientTotal, onConfirm, onCancel }) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open, onCancel)
  if (!open || !order) return null

  return (
    <div className="fixed inset-0 z-[90] p-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="order-preview-title"
        className="relative max-h-[90dvh] overflow-y-auto bg-[var(--brand-surface)] rounded-2xl shadow-2xl w-full max-w-2xl p-6 z-10"
      >
        <h3 id="order-preview-title" className="text-xl font-bold mb-4">Review updated order total</h3>
        <div className="space-y-3 max-h-60 overflow-auto mb-4">
          {(order.items || []).map((it) => (
            <div key={it.id} className="flex justify-between items-center">
              <div>
                <div className="font-bold">{it.name}</div>
                <div className="text-xs text-accent/60">Qty: {it.quantity}</div>
              </div>
              <div className="font-bold">₹{(it.price * it.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-secondary-dark pt-4 mb-4">
          <div className="flex justify-between text-accent/70">
            <span>Items Subtotal</span>
            <span className="font-bold">₹{Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-accent/70">
            <span>Delivery</span>
            <span className="font-bold">{order.delivery === 0 ? 'FREE' : `₹${Number(order.delivery).toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-accent/70">
            <span>Tax (5%)</span>
            <span className="font-bold">₹{Number(order.tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-2xl font-black text-accent">
            <span>Grand Total</span>
            <span>₹{Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {Number(clientTotal.toFixed(2)) !== Number(order.total.toFixed(2)) && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            Server recalculated your total from ₹{clientTotal.toFixed(2)} to ₹{Number(order.total).toFixed(2)}.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border">Cancel</button>
          <button onClick={onConfirm} className="btn-primary px-6 py-2">Confirm & Place Order</button>
        </div>
      </motion.div>
    </div>
  )
}

export default OrderPreviewModal
