export function normalizeNotification(item = {}) {
  const source = item && typeof item === 'object' ? item : {}
  const id = String(source.id || `n-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`)
  const createdAt = source.createdAt || new Date().toISOString()

  return {
    id,
    title: source.title || 'Update',
    message: source.message || '',
    createdAt,
    read: Boolean(source.read),
  }
}

export function addNotification(items = [], draft = {}) {
  const list = Array.isArray(items) ? items.map(normalizeNotification) : []
  const nextItem = normalizeNotification({ ...draft, read: false })

  return [nextItem, ...list.filter((item) => item.id !== nextItem.id)].slice(0, 20)
}

export function markNotificationAsRead(items = [], id) {
  if (!id || !Array.isArray(items)) return Array.isArray(items) ? items : []
  return items.map((item) => (item.id === id ? { ...item, read: true } : item))
}

export function getUnreadCount(items = []) {
  const list = Array.isArray(items) ? items : []
  return list.filter((item) => !item.read).length
}

export function loadStoredNotifications(raw = '[]') {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeNotification)
  } catch {
    return []
  }
}
