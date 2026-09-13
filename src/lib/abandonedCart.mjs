export function getAbandonedCartPrompt(cart = null) {
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) return null

  const updatedAt = cart.updatedAt || cart.updated_at || new Date().toISOString()
  const updatedMs = Number(new Date(updatedAt).getTime())
  const nowMs = Date.now()

  if (!Number.isFinite(updatedMs) || nowMs - updatedMs > 1000 * 60 * 60 * 24) {
    return null
  }

  const firstItem = cart.items[0]
  const itemName = firstItem?.name || 'your last order'
  const subtotal = cart.items.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0)

  return {
    title: 'Finish your order',
    message: `You left ${itemName} in your cart. Your total is ₹${subtotal.toFixed(2)}.`,
    action: 'Go to cart',
    link: '/cart',
  }
}
