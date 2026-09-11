import { create } from 'zustand'

const STORAGE_KEY = 'craving-point-favorites'

interface FavoritesState {
  ids: string[];
  toggle: (menuItemId: string) => void;
  has: (menuItemId: string) => boolean;
}

const readStored = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: readStored(),
  toggle: (menuItemId) =>
    set((state) => {
      const next = state.ids.includes(menuItemId)
        ? state.ids.filter((id) => id !== menuItemId)
        : [...state.ids, menuItemId]
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Keep favorites in memory. */ }
      }
      return { ids: next }
    }),
  has: (menuItemId) => get().ids.includes(menuItemId),
}))

export default useFavoritesStore