import React, { useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingBag, Star, Leaf, Flame } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'
import { useFavoritesStore } from '../store/useFavoritesStore'
import { useCartStore } from '../store/useCartStore'
import { productMedia } from '../lib/productMedia'

const ProductDetail = () => {
  const { menuItems } = useRestaurantData()
  const { id } = useParams()
  const { addItem } = useCartStore()
  const { has, toggle } = useFavoritesStore()
  const [added, setAdded] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState('')
  const [quantity, setQuantity] = useState(1)

  const item = useMemo(
    () => menuItems.find((menuItem) => menuItem.slug === id || menuItem.id === id),
    [id, menuItems],
  )

  const addOns = item?.addons || []

  const [selectedAddons, setSelectedAddons] = useState<string[]>([])

  useEffect(() => { setSelectedVariant(''); setQuantity(1); setSelectedAddons([]); setAdded(false) }, [id])
  const unitPrice = item?.price_variants?.find(variant => variant.label === selectedVariant)?.price ?? item?.price ?? 0

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((current) =>
      current.includes(addonId) ? current.filter((id) => id !== addonId) : [...current, addonId],
    )
  }

  const selectedAddonTotal = addOns
    .filter((addon) => selectedAddons.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0)

  if (!item || item.deleted_at) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="section-title">Item not found</h1><Link to="/menu" className="btn-primary mt-6">Browse menu</Link></div>
  const available = item.is_available && item.stock_quantity !== 0 && (!item.available_from || Date.parse(item.available_from)<=Date.now()) && (!item.available_until || Date.parse(item.available_until)>Date.now())

  const handleAddToCart = () => {
    if (!available) return
    setAdded(true)
    addItem({
      ...item,
      quantity,
      price: unitPrice + selectedAddonTotal,
      selectedVariant: selectedVariant || item.price_variants?.[0]?.label,
      selectedAddons: addOns.filter((addon) => selectedAddons.includes(addon.id)),
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link to="/menu" className="mb-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-primary">
        <ArrowLeft size={16} /> Back to menu
      </Link>

      <div className="mb-6 flex items-center gap-4"><button className="btn-secondary" aria-pressed={has(item.id)} onClick={() => toggle(item.id)}>{has(item.id) ? 'Remove favorite' : 'Save favorite'}</button><span role="status">{added ? 'Added to cart' : ''}</span></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="card-premium overflow-hidden p-4">
          <div className="relative overflow-hidden rounded-[24px]">
            <img src={productMedia(item) || '/images/logo-generated.svg'} alt={productMedia(item) ? item.name : 'Craving Point logo'} className={'h-[520px] w-full ' + (item.category_id === 'combos' ? 'object-contain bg-black' : 'object-cover')} />
            {!!item.image_urls?.length&&<div className="grid grid-cols-3 gap-2 mt-3">{item.image_urls.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={item.name+' view '+(index+2)} loading="lazy" className="w-full rounded-lg object-cover aspect-square"/></a>)}</div>}<div className="absolute left-4 top-4 flex gap-2">
              {item.is_bestseller && (
                <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#120f10]">
                  Bestseller
                </span>
              )}
              {item.is_spicy && (
                <span className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                  Spicy
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-primary">
            {item.is_veg ? <Leaf size={16} /> : <Flame size={16} />}
            {item.is_veg ? 'Veg' : 'Non-veg'}
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-5xl">{item.name}</h1>



          <p className="text-lg leading-8 text-white/75">{item.description}</p>

          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            {item.portion && <div><dt className="font-bold">Portion</dt><dd className="text-accent/60">{item.portion}</dd></div>}
            {!!item.ingredients?.length && <div><dt className="font-bold">Ingredients</dt><dd className="text-accent/60">{item.ingredients.join(', ')}</dd></div>}
            <div><dt className="font-bold">Allergen information</dt><dd className="text-accent/60">{item.allergens?.length ? item.allergens.join(', ') : 'Please ask the restaurant about ingredients and cross-contact before ordering.'}</dd></div>
          </dl>
          <div className="flex items-end gap-4">
            <div className="text-4xl font-black text-primary">₹{unitPrice}</div>
            <div className="text-sm text-white/50">{item.is_available ? 'Available now' : 'Currently unavailable'}</div>
          </div>

          {item.price_variants && <div className="flex flex-wrap gap-3" aria-label="Choose size">{item.price_variants.map((variant, index) => <button key={variant.label} type="button" aria-pressed={selectedVariant ? selectedVariant === variant.label : index === 0} onClick={() => setSelectedVariant(variant.label)} className="btn-secondary aria-pressed:border-primary">{variant.label} · ₹{variant.price}</button>)}</div>}
          <div className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-[0.2em] text-white/55">Quantity</span>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#120f10] px-3 py-2">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="text-white/80">
                  <Minus size={16} />
                </button>
                <span className="min-w-[2rem] text-center font-black text-white">{quantity}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((current) => Math.min(99, current + 1))} className="text-white/80">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {addOns.map((addon) => (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => toggleAddon(addon.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    selectedAddons.includes(addon.id)
                      ? 'border-primary bg-primary/10 text-white'
                      : 'border-white/10 bg-[#120f10] text-white/70'
                  }`}
                >
                  <span className="font-semibold">{addon.name}</span>
                  <span className="font-black text-primary">₹{addon.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <button type="button" disabled={!available} onClick={handleAddToCart} className="btn-primary flex-1 gap-2 px-8 py-4 text-base">
              <ShoppingBag size={18} /> Add to cart
            </button>
            <Link to="/menu" className="btn-secondary flex-1 px-8 py-4 text-base">
              Continue shopping
            </Link>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
            Estimated total: ₹{(unitPrice + selectedAddonTotal) * quantity}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail

