import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Search, Plus, Minus } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'
import { useCartStore } from '../store/useCartStore'
import { useUIStore } from '../store/useUIStore'
import { useDepth } from '../hooks/useExperience'
import { productMedia } from '../lib/productMedia'
import ProductModal from './ProductModal'
import type { MenuItem, MenuType } from '../types'
import '../styles/combos.css'

function FoodCard({ item, category, onSelect }: { item: MenuItem; category: string; onSelect: (item: MenuItem) => void }) {
  const ref = useDepth<HTMLElement>()
  const media = productMedia(item)
  const cart = useCartStore()
  const customizable = Boolean(item.price_variants?.length || item.addons?.length)
  const line = cart.items.find(row => (row.productId || row.id) === item.id && !row.selectedVariant && !row.selectedAddons?.length)
  const price = item.price_variants?.length ? Math.min(...item.price_variants.map(v => v.price)) : item.price
  const add = () => customizable ? onSelect(item) : cart.addItem({...item, quantity:1, selectedAddons:[]})
  return <article ref={ref} className={'editorial-food-card ' + (media ? 'has-photo' : 'text-food-card') + (item.category_id === 'combos' ? ' combo-food-card' : '')}>
    {media && <button className="food-card-image" onClick={() => onSelect(item)} aria-label={'View '+item.name}><img src={media} srcSet={media.endsWith("-1152.webp") ? media.replace("-1152", "-576")+" 576w, "+media+" 1152w" : undefined} sizes="(max-width: 767px) 50vw, (max-width: 1023px) 45vw, 25vw" alt={item.name} loading="lazy" width="576" height="460"/><span className="image-view">VIEW <ArrowUpRight size={16}/></span></button>}
    <div className="food-card-body"><div className="food-card-meta"><span>{category}</span><span className={item.is_veg ? 'diet-veg' : 'diet-nonveg'}>{item.is_veg ? 'VEG' : 'NON-VEG'}</span></div><button className="food-title" onClick={() => onSelect(item)}><h3>{item.name}</h3></button><p>{item.description}</p><div className="food-card-bottom"><span>{item.price_variants?.length ? <small>FROM </small> : null}₹{price}</span><div className="food-card-actions"><button className="food-details" onClick={() => onSelect(item)}>View <ArrowUpRight size={14}/></button>{!customizable && line ? <div className="food-quantity"><button aria-label={'Remove one '+item.name} onClick={() => cart.updateQuantity(line.id,line.quantity-1)}><Minus size={16}/></button><output aria-live="polite">{line.quantity}</output><button aria-label={'Add one '+item.name} disabled={line.quantity >= Math.min(99,item.stock_quantity ?? 99)} onClick={() => cart.updateQuantity(line.id,line.quantity+1)}><Plus size={16}/></button></div> : <button className="food-add" onClick={add} aria-label={(customizable ? 'Choose ' : 'Add ')+item.name}><Plus size={16}/>{customizable ? 'CHOOSE' : 'ADD'}</button>}</div></div></div>
  </article>
}

export default function MenuExperience({ embedded = false }: { embedded?: boolean }) {
  const { categories, menuItems, restaurantSettings } = useRestaurantData()
  const location = useLocation()
  const initialType = () => { const query = new URLSearchParams(location.search).get('type'); if (query === 'sweet' || query === 'savoury') return query; try { return sessionStorage.getItem('cp-menu-type') === 'savoury' ? 'savoury' : 'sweet' } catch { return 'sweet' } }
  const [type, setType] = useState<MenuType>(initialType)
  const [category, setCategory] = useState('featured')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const addItem = useCartStore(s => s.addItem)
  const setCartOpen = useUIStore(s => s.setCartOpen)
  const active = categories.filter(c => c.is_active && (c.menu_type === type || c.id === 'combos')).sort((a,b) => a.display_order - b.display_order)
  useEffect(() => { if (location.state?.focusSearch) search.current?.focus() }, [location.state])
  useEffect(() => { const hashId = location.hash.replace('#cat-', ''); const target = categories.find(c => c.id === hashId); if (target?.menu_type) { setType(target.menu_type); setCategory(target.id) } }, [location.hash, categories])
  useEffect(() => { const target = new URLSearchParams(location.search).get('type'); if (target === 'sweet' || target === 'savoury') { setType(target); setCategory('featured') } }, [location.search])
  useEffect(() => { try { sessionStorage.setItem('cp-menu-type', type) } catch { /* In-memory selection still works. */ } }, [type])
  const eligible = menuItems.filter(item => item.is_available && !item.deleted_at && item.stock_quantity !== 0 && (!item.available_from || Date.parse(item.available_from) <= Date.now()) && (!item.available_until || Date.parse(item.available_until) > Date.now()) && active.some(c => c.id === item.category_id)).sort((a,b)=>(a.display_order||0)-(b.display_order||0))
  let visible = eligible.filter(item => (category === 'featured' || item.category_id === category) && (!query || (item.name+' '+item.description).toLowerCase().includes(query.toLowerCase())))
  if (category === 'featured' && !query) visible = [...visible].sort((a,b) => Number(!!productMedia(b))-Number(!!productMedia(a)) || Number(!!b.is_featured)-Number(!!a.is_featured)).slice(0, embedded ? 4 : 8)
  const Heading = embedded ? 'h2' : 'h1'
  return <section id="menu" className="menu-experience editorial-shell">
    <div className="section-heading"><div><p className="small-label">02 / FOLLOW YOUR CRAVING</p><Heading>SWEET. SAVOURY.<br/><em>YOUR CALL.</em></Heading></div><div className="menu-switch" aria-label="Menu type">{(['sweet','savoury'] as const).map(value => <button key={value} aria-pressed={type===value} className={type===value?'active':''} onClick={() => { setType(value); setCategory('featured'); setQuery('') }}>{value} <span>{value==='sweet'?'✳':'↗'}</span></button>)}</div></div>
    {!restaurantSettings.online_ordering_enabled&&<p role="status" className="mb-5 p-4 border border-primary/30 rounded-xl">Ordering is temporarily paused. You can browse the menu and order when we reopen.</p>}<div className="menu-toolbar"><nav className="menu-categories" aria-label="Menu categories"><button aria-pressed={category==='featured'} onClick={() => setCategory('featured')} className={category==='featured'?'active':''}>The edit</button>{active.map(c => <button key={c.id} aria-pressed={category===c.id} onClick={() => setCategory(c.id)} className={category===c.id?'active':''}>{c.name}</button>)}</nav><label className="menu-search"><Search size={18}/><input ref={search} value={query} onChange={e => setQuery(e.target.value)} placeholder="Find your craving" aria-label="Search menu"/></label></div>
    <div className="menu-results-label"><span>{category === 'featured' ? 'A LITTLE INSPIRATION TO GET YOU STARTED' : active.find(c=>c.id===category)?.description}</span><span role="status">{visible.length} {visible.length===1?'DISH':'DISHES'}</span></div>
    <div className="editorial-menu-grid" key={type+'-'+category}>{visible.map(item => <FoodCard key={item.id} item={item} category={active.find(c=>c.id===item.category_id)?.name || type} onSelect={setSelected}/>)}</div>
    {!visible.length && <div className="menu-empty"><h3>No cravings found.</h3><p>Try another category or search.</p><button className="text-link" onClick={() => { setQuery(''); setCategory('featured') }}>Reset filters ↗</button></div>}
    <div className="menu-footnote"><p>Choose a dish for sizes, quantities and available extras.</p>{embedded ? <Link className="text-link" to="/menu">Explore the full menu <ArrowUpRight size={18}/></Link> : <a className="text-link" href="/images/menu.pdf" target="_blank" rel="noreferrer">View printed menu <ArrowUpRight size={18}/></a>}</div>
    {selected && <ProductModal key={selected.id} item={selected} onClose={() => setSelected(null)} onAdd={(quantity,price,_image,variant,addons) => { addItem({...selected,quantity,price,selectedVariant:variant,selectedAddons:addons || []}); setCartOpen(true) }}/>} 
  </section>
}
