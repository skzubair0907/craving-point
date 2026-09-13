export function getActiveOffers(offers = []) {
  if (!Array.isArray(offers)) return null

  const now = Date.now()
  const active = offers.filter((offer) => {
    if (!offer || offer.is_active !== true) return false
    if (!offer.expires_at) return true
    const expiresAt = new Date(offer.expires_at).getTime()
    return Number.isFinite(expiresAt) ? expiresAt >= now : true
  })

  if (!active.length) return null

  return active.slice(0, 3).map((offer) => ({
    id: offer.id,
    title: offer.title,
    description: offer.description,
    discount: offer.discount,
    image_url: offer.image_url,
    link: '/offers',
  }))
}
