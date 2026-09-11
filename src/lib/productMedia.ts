import { generatedMenuMedia } from '../data/generatedMenuMedia'
import type { MenuItem } from '../types'

// Match each dish to its supplied or generated product artwork.
const artwork: Record<string, string> = {
  'waffle-dark-white': '/images/waffle-dark-white.png',
  'waffle-chocolate-classic': '/images/gallery3-1152.webp',
  'waffle-ferrero': '/images/gallery2-1152.webp',
  'bowl-oreo': '/images/gallery1-1152.webp',
  'bowl-chocolate-classic': '/images/gallery4-1152.webp',
}
export function productMedia(item: MenuItem): string | null {
  if (item.image_override && item.image_url) return item.image_url
  if (item.category_id === 'combos' && item.image_url) return item.image_url
  if (generatedMenuMedia[item.id]) return generatedMenuMedia[item.id]
  if (artwork[item.id]) return artwork[item.id]
  if (item.image_url && !/\/images\/(offer\d+|menu\d+|17)\.jpe?g$/.test(item.image_url)) return item.image_url
  return null
}
