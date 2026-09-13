export function getBestsellerHighlights(items = []) {
  if (!Array.isArray(items)) return null

  const highlights = items
    .filter((item) => item && item.is_bestseller && item.is_available && !item.deleted_at)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: Number(item.price) || 0,
      link: '/menu/' + item.slug,
    }))

  return highlights.length ? highlights : null
}
