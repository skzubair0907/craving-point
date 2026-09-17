import { randomId } from '../lib/randomId'
import { useState } from 'react'
import { useRestaurantStore, type Catalog } from '../store/useRestaurantData'
import { supabase } from '../lib/supabase'
import CatalogActions from './CatalogActions'
import { productMedia } from '../lib/productMedia'
import { normalizeMenuItemDraft } from '../lib/menuItemNormalize.js'

type Section = 'menuItems' | 'categories' | 'coupons'
const money = (value: unknown) => Number(value || 0).toFixed(2)
export default function CatalogEditor({ section }: { section: Section }) {
  const { catalog, revision, publish, loaded, error: loadError } = useRestaurantStore()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<any>(null)
  const [original, setOriginal] = useState<string | null>(null)
  const [baseRevision, setBaseRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState<File[]>([])
  const [preview, setPreview] = useState(false)
  const records: any[] = catalog[section]
  const title = section === 'menuItems' ? 'Menu items' : section === 'categories' ? 'Categories' : 'Coupons'
  const keyOf = (row: any) => section === 'coupons' ? row.code : row.id
  const open = (row?: any) => {
    setMessage(''); setPhoto([]); setOriginal(row ? keyOf(row) : null); setBaseRevision(revision)
    setDraft(row ? { ...structuredClone(row), ...(section === 'menuItems' ? { image_url: productMedia(row) || row.image_url } : {}) } : section === 'menuItems' ? {
      id: randomId(), name: '', slug: '', category_id: catalog.categories.find(c => c.id !== 'all')?.id || '', description: '', portion: '', ingredients: [], allergens: [], price: 0,
      image_url: '/images/17.jpeg', is_veg: true, is_available: true, is_bestseller: false, is_featured: false, is_spicy: false, tags: [], price_variants: [], addons: [],
    } : section === 'categories' ? { id: randomId(), name: '', description: '', display_order: records.length, is_active: true, menu_type: 'sweet' } : { code: '', type: 'fixed', value: 0, minimum: 0, active: true })
  }
  const field = (name: string, label: string, type = 'text') => <label className="grid gap-2" key={name}>{label}<input required={['name', 'code'].includes(name)} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '.01' : undefined} value={draft[name] ?? ''} onChange={e => setDraft({ ...draft, [name]: type === 'number' ? Number(e.target.value) : e.target.value })} className="admin-input" /></label>
  const flag = (name: string, label: string) => <label key={name} className="flex items-center gap-3"><input type="checkbox" checked={Boolean(draft[name])} onChange={e => setDraft({ ...draft, [name]: e.target.checked })} />{label}</label>
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (useRestaurantStore.getState().revision !== baseRevision) throw new Error('The catalog changed while you were editing. Close and reopen this item to use the latest version.')
      const next = { ...draft }
      if (section === 'menuItems') {
        const normalizedDraft = normalizeMenuItemDraft(next)
        Object.assign(next, normalizedDraft)
        next.image_override = true
        next.slug = next.slug.trim() || next.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        if (!next.slug || records.some(row => row.id !== original && row.slug === next.slug)) throw new Error('Use a unique product URL name.')
        if (!next.category_id || !catalog.categories.some(c => c.id === next.category_id)) throw new Error('Choose a category first.')
        next.ingredients = (next.ingredients || []).map((v: string) => v.trim()).filter(Boolean)
        next.allergens = (next.allergens || []).map((v: string) => v.trim()).filter(Boolean)
        if (new Set((next.price_variants || []).map((v: any) => v.label.trim())).size !== (next.price_variants || []).length) throw new Error('Each size needs a different name.')
        if (photo.length) {
          if (photo.length > 6 || photo.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) throw new Error('Choose up to 6 JPG, PNG or WebP images, each under 5 MB.')
          const urls: string[] = []
          for (const image of photo) {
            const file = randomId()+'.'+image.type.split('/')[1]
            const uploaded = await supabase.storage.from('menu-images').upload(file,image)
            if (uploaded.error) throw uploaded.error
            urls.push(supabase.storage.from('menu-images').getPublicUrl(file).data.publicUrl)
          }
          next.image_url = urls[0]
          next.image_urls = urls.slice(1)
        }
      }
      if (section === 'coupons') {
        next.code = next.code.trim().toUpperCase()
        if (!/^[A-Z0-9]{3,24}$/.test(next.code)) throw new Error('Use 3–24 letters or numbers for a coupon code.')
        if (records.some(row => row.code !== original && row.code === next.code)) throw new Error('That coupon code already exists.')
        if (next.type === 'percentage' && next.value > 100) throw new Error('Percentage discounts cannot exceed 100%.')
      }
      const updated = original ? records.map(row => keyOf(row) === original ? next : row) : [...records, next]
      await publish(section, updated as Catalog[Section])
      setDraft(null); setMessage('Published. The storefront and checkout now use these values.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish changes.') }
    finally { setBusy(false) }
  }
  return <div className="p-4 sm:p-8 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="section-title">{title}</h1><button className="btn-primary" onClick={() => open()} disabled={!loaded}>Add {section === 'menuItems' ? 'item' : section === 'categories' ? 'category' : 'coupon'}</button></div>
    {loadError && <p role="alert">{loadError}</p>}
    {message && <p role="status" className="rounded-xl border border-primary/30 p-4">{message}</p>}
    {draft ? <form onSubmit={save} className="card-premium p-5 space-y-6">
      <h2 className="text-2xl font-bold">{original ? 'Edit' : 'Add'} {section === 'menuItems' ? 'menu item' : section === 'categories' ? 'category' : 'coupon'}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {section !== 'coupons' ? field('name', 'Name') : field('code', 'Coupon code')}
        {section === 'menuItems' && <>
          {field('price', 'Base price (₹)', 'number')}{field('slug', 'Product URL name')}{field('portion', 'Portion / serving size')}
          <label className="grid gap-2">Category<select className="admin-input" value={draft.category_id} onChange={e => setDraft({ ...draft, category_id: e.target.value })}>{catalog.categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {field('image_url', 'Main photo URL or local image path')}{field('sku', 'SKU / product code')}{field('preparation_minutes', 'Preparation minutes', 'number')}{field('display_order', 'Display order', 'number')}{field('available_from', 'Available from', 'datetime-local')}{field('available_until', 'Available until', 'datetime-local')}<label className="grid gap-2">Additional image URLs (one per line)<textarea className="admin-input" value={(draft.image_urls||[]).join('\n')} onChange={e=>setDraft({...draft,image_urls:e.target.value.split('\n').filter(Boolean)})}/></label>
          <label className="grid gap-2">Upload product photos (first image is the main photo)<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(Array.from(e.target.files || []))} /></label>
          {['ingredients', 'allergens'].map(name => <label className="grid gap-2" key={name}>{name === 'ingredients' ? 'Ingredients (separate with commas)' : 'Allergens (separate with commas)'}<input className="admin-input" value={(draft[name] || []).join(', ')} onChange={e => setDraft({ ...draft, [name]: e.target.value.split(',').map(v => v.trimStart()) })} /></label>)}
        </>}
        {section !== 'coupons' && <label className="grid gap-2 sm:col-span-2">Description<textarea className="admin-input" rows={3} value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>}
        {section === 'categories' && <>{field('display_order', 'Display order', 'number')}<label className="grid gap-2">Menu type<select className="admin-input" value={draft.menu_type || 'sweet'} onChange={e => setDraft({ ...draft, menu_type: e.target.value })}><option value="sweet">Sweet</option><option value="savoury">Savoury</option></select></label>{flag('is_active', 'Visible on the menu')}</>}
        {section === 'coupons' && <><label className="grid gap-2">Discount type<select className="admin-input" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}><option value="fixed">Fixed amount (₹)</option><option value="percentage">Percentage</option></select></label>{field('value', 'Discount value', 'number')}{field('minimum', 'Minimum subtotal (₹)', 'number')}{flag('active', 'Active')}</>}
      </div>
      {section === 'menuItems' && <>
        <div className="flex flex-wrap gap-5">{flag('is_available', 'Available')}{flag('is_veg', 'Vegetarian')}{flag('is_bestseller', 'Bestseller')}{flag('is_featured', 'Show on homepage')}{flag('is_spicy', 'Spicy')}</div>
        {(['price_variants', 'addons'] as const).map(group => <fieldset key={group} className="space-y-3"><legend className="font-bold mb-3">{group === 'price_variants' ? 'Sizes and prices (first size sets the base price)' : 'Available extras'}</legend>{(draft[group] || []).map((row: any, index: number) => <div className="flex flex-wrap gap-2" key={index}><input required aria-label="Option name" className="admin-input flex-1" value={row.label ?? row.name} onChange={e => setDraft({ ...draft, [group]: draft[group].map((v: any, i: number) => i === index ? { ...v, [group === 'price_variants' ? 'label' : 'name']: e.target.value } : v) })} /><input required aria-label="Option price" type="number" min="0" step=".01" className="admin-input w-28" value={row.price} onChange={e => setDraft({ ...draft, [group]: draft[group].map((v: any, i: number) => i === index ? { ...v, price: Number(e.target.value) } : v) })} /><button type="button" onClick={() => setDraft({ ...draft, [group]: draft[group].filter((_: any, i: number) => i !== index) })}>Remove</button></div>)}<button type="button" className="btn-secondary" onClick={() => setDraft({ ...draft, [group]: [...(draft[group] || []), group === 'price_variants' ? { label: '', price: 0 } : { id: randomId(), name: '', price: 0 }] })}>Add {group === 'price_variants' ? 'size' : 'extra'}</button></fieldset>)}
      </>}
      {section==='menuItems'&&<><button type="button" className="btn-secondary" onClick={()=>setPreview(!preview)}>Preview product</button>{preview&&<article className="card-premium p-5"><img className="w-48 rounded-lg" src={draft.image_url} alt={draft.name}/><h3>{draft.name}</h3><p>{draft.description}</p><p>?{draft.price}</p></article>}</>}<div className="flex flex-wrap gap-3"><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish changes'}</button><button type="button" className="btn-secondary" disabled={busy} onClick={() => setDraft(null)}>Cancel</button></div>
    </form> : <>
      <input className="admin-input w-full" aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}…`} value={query} onChange={e => setQuery(e.target.value)} />
      <div className="card-premium overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="p-4">Name</th><th className="p-4">{section === 'categories' ? 'Order' : 'Price / value'}</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>
        {records.filter(row => row.id !== 'all' && String(row.name || row.code).toLowerCase().includes(query.toLowerCase())).map(row => <tr key={keyOf(row)} className="border-t border-[var(--brand-border)]"><td className="p-4">{row.name || row.code}</td><td className="p-4">{section === 'menuItems' ? `₹${money(row.price)}` : section === 'coupons' ? `${row.type === 'fixed' ? '₹' : ''}${row.value}${row.type === 'percentage' ? '%' : ''}` : row.display_order}</td><td className="p-4">{row.deleted_at ? 'Deleted' : (row.is_available ?? row.is_active ?? row.active) ? 'Active' : 'Hidden'}</td><td className="p-4"><button className="text-primary font-bold" onClick={() => open(row)}>Edit</button>{section==='menuItems'&&<CatalogActions item={row}/>}</td></tr>)}
      </tbody></table>{!records.length && <p className="p-6">No records yet.</p>}</div>
    </>}
  </div>
}
