import { create } from 'zustand'
import { useRestaurantStore } from './useRestaurantData'
import { CartItem } from '../types'

interface CartState {
  items: CartItem[];
  coupon: string;
  setCoupon: (code: string) => void;
  getCouponDiscount: (subtotal: number) => number;
  loyaltyPoints: number;
  rewardApplied: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getDeliveryFee: (subtotal: number) => number;
  getTax: (subtotal: number) => number;
  getRewardDiscount: (subtotal: number) => number;
  addLoyaltyPoints: (amount: number) => void;
  setRewardApplied: (value: boolean) => void;
}

const STORAGE_KEY = 'craving-point-cart'
const LOYALTY_KEY = 'craving-point-loyalty-points'
const REWARD_KEY = 'craving-point-reward-applied'

const readStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string' && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99) : []
  } catch {
    return []
  }
}

const readStoredNumber = (key: string, fallback: number): number => {
  if (typeof window === 'undefined') return fallback

  try {
    const item = window.localStorage.getItem(key)
    return item ? Number(item) || fallback : fallback
  } catch {
    return fallback
  }
}

const readStoredBoolean = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : raw === 'true'
  } catch {
    return fallback
  }
}

const persistCart = (items: CartItem[]) => {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* Storage may be unavailable. */ }
  }
}

const persistLoyaltyPoints = (points: number) => {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(LOYALTY_KEY, String(points)) } catch { /* Storage may be unavailable. */ }
  }
}

const persistRewardState = (value: boolean) => {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(REWARD_KEY, String(value)) } catch { /* Storage may be unavailable. */ }
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: readStoredCart(),
  coupon: '',
  setCoupon: (coupon) => set({ coupon }),
  getCouponDiscount: (subtotal) => {
    const coupon = useRestaurantStore.getState().catalog.coupons.find(c => c.code === get().coupon && c.active && subtotal >= c.minimum)
    return coupon ? Number(Math.min(subtotal, coupon.type === 'percentage' ? subtotal * coupon.value / 100 : coupon.value).toFixed(2)) : 0
  },
  loyaltyPoints: readStoredNumber(LOYALTY_KEY, 0),
  rewardApplied: readStoredBoolean(REWARD_KEY, false),
  addItem: (newItem) => {
    if (!newItem.is_available || !Number.isFinite(newItem.price)) return
    const productId = newItem.productId || newItem.id
    const selectedVariant = newItem.selectedVariant || newItem.price_variants?.find((variant) => variant.price === newItem.price)?.label
    const id = [productId, selectedVariant || '', ...(newItem.selectedAddons || []).map((addon) => addon.id).sort()].join('::')
    newItem = { ...newItem, productId, selectedVariant, id, name: newItem.name + (selectedVariant ? ' (' + selectedVariant + ')' : '') }
    const quantity = Math.min(99, Math.max(1, Math.floor(newItem.quantity) || 1))
    set((state) => {
      const existingItem = state.items.find((i) => i.id === newItem.id)
      const nextItems = existingItem
        ? state.items.map((i) =>
            i.id === newItem.id ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i,
          )
        : [...state.items, { ...newItem, quantity }]

      persistCart(nextItems)
      return { items: nextItems }
    })
  },
  removeItem: (id) =>
    set((state) => {
      const nextItems = state.items.filter((i) => i.id !== id)
      persistCart(nextItems)
      return { items: nextItems }
    }),
  updateQuantity: (id, quantity) =>
    set((state) => {
      const nextItems = state.items
        .map((i) => (i.id === id ? { ...i, quantity: Math.min(99, Math.max(0, Math.floor(quantity) || 0)) } : i))
        .filter((i) => i.quantity > 0)

      persistCart(nextItems)
      return { items: nextItems }
    }),
  clearCart: () => {
    persistCart([])
    set({ items: [], rewardApplied: false, coupon: '' })
    persistRewardState(false)
  },
  getTotal: () => {
    return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  },
  getDeliveryFee: (subtotal) => { const s = useRestaurantStore.getState().catalog.restaurantSettings; return subtotal > s.free_delivery_above ? 0 : s.delivery_fee },
  getTax: (subtotal) => Number((subtotal * (useRestaurantStore.getState().catalog.restaurantSettings.tax_percentage ?? 5) / 100).toFixed(2)),
  getRewardDiscount: () => 0,
  addLoyaltyPoints: (amount) => {
    set((state) => {
      const nextPoints = Math.max(0, state.loyaltyPoints + amount)
      persistLoyaltyPoints(nextPoints)
      return { loyaltyPoints: nextPoints }
    })
  },
  setRewardApplied: (value) => {
    persistRewardState(value)
    set({ rewardApplied: value })
  },
}))