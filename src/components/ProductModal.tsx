import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowUpRight, Minus, Plus } from 'lucide-react'
import type { MenuItem, Addon } from '../types'
import { useRestaurantData } from '../store/useRestaurantData'
import { useFocusTrap } from '../lib/focusTrap'
import { productMedia } from '../lib/productMedia'

export default function ProductModal({ item, onClose, onAdd }: { item: MenuItem; onClose: () => void; onAdd: (quantity: number, price: number, image: HTMLImageElement | null, variant?: string, addons?: Addon[]) => void | Promise<void> }) {
  const { restaurantSettings: settings } = useRestaurantData()
  const [quantity, setQuantity] = useState(1)
  const [variant, setVariant] = useState(item.price_variants?.[0])
  const [addonIds, setAddonIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  useFocusTrap(dialog, true, onClose)
  const addons = (item.addons || []).filter(a => addonIds.includes(a.id))
  const price = (variant?.price ?? item.price) + addons.reduce((total,a)=>total+a.price,0)
  const media = productMedia(item)
  const message = ['Hello Craving Point,', "I'd like to order:", '', item.name, 'Size: '+(variant?.label || item.portion || 'Standard'), 'Quantity: '+quantity, 'Extras: '+(addons.map(a=>a.name).join(', ') || 'None'), 'Customization: '+(notes.trim() || 'None'), 'Item total: ₹'+price*quantity, '', 'Please confirm availability and the final total.'].join('\n')
  return <div className="product-overlay" onClick={onClose}><div ref={dialog} className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onClick={e=>e.stopPropagation()}><button className="dialog-close" onClick={onClose} aria-label="Close product details"><X/></button>
    {media && <div className={'dialog-image' + (item.category_id === 'combos' ? ' combo-poster' : '')}><img ref={img} src={media} alt={item.name}/></div>}
    <div className="dialog-copy"><p className="small-label">MAKE IT YOURS · {item.is_veg?'VEGETARIAN':'NON-VEGETARIAN'}</p><h2 id="product-modal-title">{item.name}</h2><p>{item.description}</p>
    {!!item.price_variants?.length && <fieldset><legend>Choose your size</legend><div className="variant-options">{item.price_variants.map(v=><button key={v.label} aria-pressed={variant?.label===v.label} className={variant?.label===v.label?'active':''} onClick={()=>setVariant(v)}>{v.label}<strong>₹{v.price}</strong></button>)}</div></fieldset>}
    {!!item.addons?.length && <fieldset><legend>Add a little extra</legend>{item.addons.map(a=><label className="addon-option" key={a.id}><input type="checkbox" checked={addonIds.includes(a.id)} onChange={()=>setAddonIds(current=>current.includes(a.id)?current.filter(id=>id!==a.id):[...current,a.id])}/>{a.name}<span>+ ₹{a.price}</span></label>)}</fieldset>}
    <div className="dialog-quantity"><span>Quantity</span><div><button aria-label="Decrease quantity" onClick={()=>setQuantity(q=>Math.max(1,q-1))} disabled={quantity===1}><Minus size={16}/></button><output aria-live="polite">{quantity}</output><button aria-label="Increase quantity" onClick={()=>setQuantity(q=>Math.min(99,q+1))} disabled={quantity===99}><Plus size={16}/></button></div></div>
    <label className="customization-label" htmlFor="order-customization">Special request for WhatsApp</label><textarea id="order-customization" value={notes} maxLength={500} onChange={e=>setNotes(e.target.value)} placeholder="Tell us how you like it. Requests are subject to confirmation." rows={2}/>
    <p className="allergen-note">{item.allergens?.length ? 'Allergens: '+item.allergens.join(', ') : 'Ask our team about ingredients and allergens before ordering.'}</p>
    <button className="editorial-button dialog-add" disabled={adding || !item.is_available} onClick={async()=>{setAdding(true);try {await onAdd(quantity,price,img.current,variant?.label,addons);onClose()}finally{setAdding(false)}}}>Add to order <span>₹{price*quantity} <Plus size={18}/></span></button>
    <a className="dialog-whatsapp" href={'https://wa.me/'+(settings.whatsapp_number||settings.phone).replace(/\D/g,'')+'?text='+encodeURIComponent(message)} target="_blank" rel="noreferrer">Order on WhatsApp <ArrowUpRight size={18}/></a><Link className="dialog-full-details" to={'/menu/'+item.slug} onClick={onClose}>Full product details & favourites ↗</Link></div>
  </div></div>
}

