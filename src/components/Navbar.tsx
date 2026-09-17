import { useFocusTrap } from '../lib/focusTrap'
import './MobileNavigation.css'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Menu, X, ArrowUpRight, User, Search } from 'lucide-react'
import { useCartStore } from '../store/useCartStore'
import { useUIStore } from '../store/useUIStore'
import CartDrawer from './CartDrawer'
import ThemeToggle from './ThemeToggle'
const links = [{name:'Home',to:'/'},{name:'Menu',to:'/menu'},{name:'About',to:'/#about'},{name:'The grill',to:'/grill'},{name:'Reels',to:'/#reels'},{name:'Gifting',to:'/#gifting'},{name:'Visit',to:'/#location'}]
export default function Navbar() {
  const [open,setOpen]=useState(false)
  const panel=useRef<HTMLDivElement>(null)
  useFocusTrap(panel,open,()=>setOpen(false))
  const [scrolled,setScrolled]=useState(false)
  const location=useLocation()
  const items=useCartStore(s=>s.items)
  const count=items.reduce((n,item)=>n+item.quantity,0)
  const setCartOpen=useUIStore(s=>s.setCartOpen)
  useEffect(()=>{setOpen(false)},[location.pathname,location.hash])
  useEffect(()=>{const scroll=()=>setScrolled(window.scrollY>24);scroll();window.addEventListener('scroll',scroll,{passive:true});return()=>window.removeEventListener('scroll',scroll)},[])
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[])
    return <><header className={'editorial-header '+(scrolled?'is-scrolled':'')}><div className="header-inner"><Link to="/" className="brand-logo header-brand-logo" aria-label="Craving Point home"><img src="/images/logo-new.png" alt="Craving Point" width="1200" height="400" /></Link><nav aria-label="Primary" className="desktop-links">{links.map(l=><Link className="nav-link" key={l.name} to={l.to}>{l.name}</Link>)}</nav><div className="header-actions"><Link className="header-order" to="/menu">Order now <ArrowUpRight size={16}/></Link><button className="header-cart" aria-label={'Shopping cart, '+count+' items'} onClick={()=>{setOpen(false);setCartOpen(true)}}><ShoppingBag size={20}/><span>{count}</span></button><button className="mobile-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="mobile-navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div></div></header>{open && <div className="mobile-menu-layer"><button className="mobile-menu-shade" aria-label="Dismiss navigation" onClick={()=>setOpen(false)}/><div ref={panel} id="mobile-navigation" className="mobile-menu-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title"><div className="mobile-menu-heading"><div><p>CRAVING POINT .88</p><h2 id="mobile-menu-title">Explore</h2></div><button className="mobile-menu-close" aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={22}/></button></div><nav aria-label="Mobile navigation" className="mobile-menu-list">{links.map(l=><Link key={l.name} to={l.to} aria-current={location.pathname+location.hash===l.to?'page':undefined} onClick={()=>setOpen(false)}><span>{l.name}</span><ArrowUpRight size={17}/></Link>)}</nav><div className="mobile-menu-secondary"><Link to="/account" onClick={()=>setOpen(false)}><User size={17}/>Account</Link><Link to="/offers" onClick={()=>setOpen(false)}>Offers</Link><Link to="/menu" state={{focusSearch:true}} onClick={()=>setOpen(false)}><Search size={17}/>Search</Link></div><div className="mobile-menu-end"><div><strong>Made for your cravings.</strong><p>Cheeta Camp, Trombay</p></div><ThemeToggle/></div></div></div>}<CartDrawer/></>
}
