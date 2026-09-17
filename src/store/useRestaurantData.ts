import { create } from 'zustand'
import { useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { menuItems, categories, restaurantSettings, offers } from '../data/mockData'
import { normalizeMenuItemDraft } from '../lib/menuItemNormalize.js'
import type { MenuItem, Category, RestaurantSettings, Offer, Review } from '../types'

export type Coupon = { code: string; type: 'fixed' | 'percentage'; value: number; minimum: number; active: boolean }
export type Catalog = {
  menuItems: MenuItem[]; categories: Category[]; restaurantSettings: RestaurantSettings;
  offers: Offer[]; coupons: Coupon[]; reviews: Review[];
}
export const defaultCatalog: Catalog = {
  menuItems, categories, restaurantSettings: { ...restaurantSettings, tax_percentage: 5, delivery_available: true, pickup_available: true, min_order_value: 0, preparation_minutes: 30 }, offers, reviews: [],
  coupons: [
    { code: 'CRAVE50', type: 'fixed', value: 50, minimum: 0, active: true },
    { code: 'SAVE20', type: 'fixed', value: 20, minimum: 0, active: true },
    { code: 'LOYAL10', type: 'percentage', value: 10, minimum: 0, active: true },
    { code: 'NEWUSER15', type: 'percentage', value: 15, minimum: 0, active: true },
  ],
}

export function normalizeCatalogData(input: Partial<Catalog> = defaultCatalog): Catalog {
  const source = { ...defaultCatalog, ...input }
  const menuItems = (source.menuItems ?? [])
    .map((item) => normalizeMenuItemDraft(item) as MenuItem)
    .filter((item) => Number(item.price) > 0 || (item.price_variants ?? []).some((variant) => Number(variant.price) > 0))

  return {
    ...source,
    menuItems,
  }
}

interface State { catalog: Catalog; revision: number; loaded: boolean; error: string; refresh: () => Promise<void>; publish: <K extends keyof Catalog>(key: K, value: Catalog[K]) => Promise<void> }
let pending: Promise<void> | null = null
export const useRestaurantStore = create<State>((set, get) => ({
  catalog: defaultCatalog, revision: 0, loaded: false, error: '',
  refresh: async () => {
    if (!isSupabaseConfigured) { set({ loaded: true }); return }
    if (pending) return pending
    pending = (async () => {
      try {
        const { data, error } = await supabase.from('storefront').select('data,revision').eq('id', 1).maybeSingle()
        if (error) throw error
        const reviewResult = await supabase.from('published_reviews').select('*').order('created_at', { ascending: false }).limit(30)
        const reviews = (reviewResult.data || []).map((r: any) => ({ ...r, date: r.created_at }))
        if (data) {
          const stockResult = await supabase.from('product_stock').select('product_id,quantity')
          const products = (data.data.menuItems || []).map((item: MenuItem) => {
            const normalized = normalizeMenuItemDraft(item)
            const stock = stockResult.data?.find((s: any) => s.product_id === normalized.id)
            return stock ? { ...normalized, stock_quantity: stock.quantity } : normalized
          })
          set({ catalog: normalizeCatalogData({ ...defaultCatalog, ...data.data, menuItems: products, reviews }), revision: data.revision, error: stockResult.error ? 'Live stock is unavailable. Checkout will verify availability.' : '' })
        }
        else set({ catalog: normalizeCatalogData({ ...defaultCatalog, reviews }), error: '' })
      } catch { set({ error: 'The live menu could not be refreshed. Prices and availability will be checked at checkout.' }) }
      finally { set({ loaded: true }); pending = null }
    })()
    return pending
  },
  publish: async (key, value) => {
    if (!isSupabaseConfigured) throw new Error('Connect Supabase before publishing changes.')
    const { catalog, revision } = get()
    const normalizedValue = key === 'menuItems' ? (Array.isArray(value) ? value.map((item) => normalizeMenuItemDraft(item)) : value) : value
    const next = normalizeCatalogData({ ...catalog, [key]: normalizedValue })
    const result = await supabase.rpc('publish_catalog', { p_section: key, p_value: normalizedValue, p_revision: revision })
    if (result.error) throw new Error(result.error.message)
    if (!result.data) { await get().refresh(); throw new Error('Another administrator changed the store. Reload this page before publishing your edits.') }
    set({ catalog: next, revision: result.data, error: '' })
  },
}))
export const useRestaurantData = () => useRestaurantStore(state => state.catalog)
export function useLiveRestaurant() {
  useEffect(() => {
    const refresh = () => { void useRestaurantStore.getState().refresh() }
    refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    const channel = isSupabaseConfigured ? supabase.channel('public-storefront').on('postgres_changes', { event: '*', schema: 'public', table: 'storefront' }, refresh).subscribe() : null
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); if (channel) void supabase.removeChannel(channel) }
  }, [])
}
