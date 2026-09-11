import { create } from 'zustand'

interface UIState {
  isCartOpen: boolean
  setCartOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isCartOpen: false,
  setCartOpen: (open: boolean) => set({ isCartOpen: open }),
}))

export default useUIStore
