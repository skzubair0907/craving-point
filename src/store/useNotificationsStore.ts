import { create } from 'zustand'
import { addNotification, getUnreadCount, loadStoredNotifications, markNotificationAsRead } from '../lib/notifications.mjs'

const STORAGE_KEY = 'craving-point-notifications'

export interface NotificationItem {
  id: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

interface NotificationsState {
  notifications: NotificationItem[]
  unreadCount: number
  add: (draft: Partial<NotificationItem>) => void
  markAsRead: (id: string) => void
  clear: () => void
}

const readStoredNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return loadStoredNotifications(raw || '[]')
  } catch {
    return []
  }
}

const persist = (notifications: NotificationItem[]) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  } catch {
    // Ignore localStorage write failures.
  }
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: readStoredNotifications(),
  unreadCount: getUnreadCount(readStoredNotifications()),
  add: (draft) =>
    set((state) => {
      const next = addNotification(state.notifications, draft)
      persist(next)
      return { notifications: next, unreadCount: getUnreadCount(next) }
    }),
  markAsRead: (id) =>
    set((state) => {
      const next = markNotificationAsRead(state.notifications, id)
      persist(next)
      return { notifications: next, unreadCount: getUnreadCount(next) }
    }),
  clear: () => {
    persist([])
    set({ notifications: [], unreadCount: 0 })
  },
}))

export default useNotificationsStore
