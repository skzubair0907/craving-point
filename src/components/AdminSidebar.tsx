import { useFocusTrap } from '../lib/focusTrap'
import { useEffect, useRef, useState } from 'react'
import './AdminResponsive.css'
import { LayoutDashboard, ShoppingBag, Utensils, Layers, Users, Ticket, Star, Settings, TrendingUp, Menu, X, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Link, useLocation } from 'react-router-dom'

const AdminSidebar = () => {
  const [open,setOpen]=useState(false)
  const location=useLocation()
  const drawer=useRef<HTMLDivElement>(null)
  useFocusTrap(drawer,open,()=>setOpen(false))
  useEffect(()=>{const close=()=>{if(window.innerWidth>=768)setOpen(false)};window.addEventListener('resize',close);return()=>window.removeEventListener('resize',close)},[])
  useEffect(()=>setOpen(false),[location.pathname])
  const menuItems = [
    { icon: <LayoutDashboard size={20}/>, label: 'Dashboard', path: '/admin' },
    { icon: <ShoppingBag size={20}/>, label: 'Orders', path: '/admin/orders' },
    { icon: <Utensils size={20}/>, label: 'Menu Items', path: '/admin/menu' },
    { icon: <Layers size={20}/>, label: 'Categories', path: '/admin/categories' },
    { icon: <Users size={20}/>, label: 'Customers', path: '/admin/customers' },
    { icon: <Ticket size={20}/>, label: 'Coupons', path: '/admin/coupons' },
    { icon: <Star size={20}/>, label: 'Reviews', path: '/admin/reviews' },
    { icon: <Settings size={20}/>, label: 'Settings', path: '/admin/settings' },
    { icon: <TrendingUp size={20}/>, label: 'Reports', path: '/admin/reports' },
    ...['Inventory','Delivery','Support','Staff','Audit','Notifications'].map(label=>({icon:<Layers size={20}/>,label,path:'/admin/'+label.toLowerCase()})),
  ]

  const current=menuItems.find(item=>item.path===location.pathname)?.label || 'Administration'
  return <>
    <div className="admin-mobile-topbar"><button className="admin-drawer-toggle" aria-label="Open admin navigation" onClick={()=>setOpen(true)}><Menu size={22}/></button><div><small>CRAVING POINT / ADMIN</small><strong>{current}</strong></div><Link to="/" aria-label="View restaurant website"><img src="/images/logo-generated.svg" width="120" height="40" alt="Craving Point"/></Link></div>
    {open&&<button className="admin-drawer-shade" aria-label="Dismiss admin navigation" onClick={()=>setOpen(false)}/>}
    <div ref={drawer} className={'admin-workspace-nav '+(open?'is-open':'')} role={open?'dialog':undefined} aria-modal={open?true:undefined} aria-label="Administration navigation">
      <div className="admin-workspace-brand">
        <div className="admin-workspace-brand-mark">
          <img src="/images/logo-generated.svg" alt="Craving Point" width="92" height="30" />
          <div>
            <small>CRAVING POINT</small>
            <strong>Operations</strong>
          </div>
        </div>
        <span className="admin-workspace-badge">LIVE OPS</span>
        <button aria-label="Close admin navigation" onClick={()=>setOpen(false)}><X size={22}/></button>
      </div>
      <p className="admin-nav-label">Manage your restaurant</p>
      <nav aria-label="Admin sections">{menuItems.map(item=><Link key={item.path} to={item.path} aria-current={location.pathname===item.path?'page':undefined} onClick={()=>setOpen(false)}>{item.icon}<span>{item.label}</span></Link>)}</nav>
      <div className="admin-workspace-end"><Link to="/">View website</Link><button onClick={()=>supabase.auth.signOut()}><LogOut size={17}/> Sign out</button></div>
    </div>
  </>
}
export default AdminSidebar
