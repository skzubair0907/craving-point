declare module '*.mjs' {
  const value: any
  export const addNotification: (...args: any[]) => any
  export const getUnreadCount: (...args: any[]) => any
  export const loadStoredNotifications: (...args: any[]) => any
  export const markNotificationAsRead: (...args: any[]) => any
  export const createReferralCode: (...args: any[]) => any
  export const getReferralLink: (...args: any[]) => any
  export const calculateReferralReward: (...args: any[]) => any
  export const getReorderPrompt: (...args: any[]) => any
  export const getAbandonedCartPrompt: (...args: any[]) => any
  export const getFavoriteHighlights: (...args: any[]) => any
  export const getBestsellerHighlights: (...args: any[]) => any
  export const getActiveOffers: (...args: any[]) => any
  export default value
}
