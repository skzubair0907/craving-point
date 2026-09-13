export function getFavoriteHighlights(favoriteIds = [], items = []) {
  if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) return null

  const uniqueIds = [...new Set(favoriteIds.filter((id) => typeof id === 'string' && id))]
  if (uniqueIds.length === 0) return null

  const matches = uniqueIds
    .map((id) => items.find((item) => item && item.id === id))
    .filter(Boolean)
    .slice(0, 3)

  if (!matches.length) return null

  return matches.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    price: Number(item.price) || 0,
    link: '/menu/' + item.slug
  }))
}
