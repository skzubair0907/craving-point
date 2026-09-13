export function getReorderPrompt(order = null) {
  if (!order || !Array.isArray(order.items) || !order.items.length) return null

  const createdAt = order.created_at || order.createdAt || new Date().toISOString()
  const createdMs = Number(new Date(createdAt).getTime())
  const nowMs = Date.now()

  if (!Number.isFinite(createdMs) || nowMs - createdMs > 1000 * 60 * 60 * 24 * 7) {
    return null
  }

  const firstItem = order.items[0]
  const itemName = firstItem?.name || 'your last order'

  return {
    title: 'Craving you again?',
    message: `Your last order included ${itemName}. Ready to re-order in one tap?`,
    action: 'Reorder last meal',
    link: '/menu',
  }
}
