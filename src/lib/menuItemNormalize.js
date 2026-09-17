export function normalizeMenuItemDraft(item = {}) {
  const draft = { ...item }

  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const toStringArray = (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
      .filter(Boolean)
  }

  const normalizedVariants = Array.isArray(draft.price_variants)
    ? draft.price_variants.map((variant) => ({
        ...variant,
        label: String(variant?.label ?? '').trim(),
        price: toNumber(variant?.price),
      })).filter((variant) => variant.label || variant.price > 0)
    : []

  draft.price_variants = normalizedVariants

  const basePrice = toNumber(draft.price)
  draft.price = basePrice > 0 ? basePrice : normalizedVariants.length ? toNumber(normalizedVariants[0].price) : 0

  draft.ingredients = toStringArray(draft.ingredients)
  draft.allergens = toStringArray(draft.allergens)
  draft.image_urls = toStringArray(draft.image_urls)

  return draft
}
