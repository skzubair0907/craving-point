import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
const sections:Record<string,string>={menu:'products',categories:'products',customers:'orders',reviews:'reviews',settings:'settings',coupons:'coupons',orders:'orders',inventory:'inventory',delivery:'delivery',support:'support',staff:'staff',audit:'audit',notifications:'notifications',reports:'reports'}
export default function AdminGuard({children}:{children:ReactNode}) {
 const location=useLocation(),[state,setState]=useState('loading')
 useEffect(()=>{
  if(!isSupabaseConfigured){setState('login');return}
  let active=true
  const check=async()=>{try{const {data:{session}}=await supabase.auth.getSession();if(!session){if(active)setState('login');return}const {data,error}=await supabase.rpc('admin_can',{section:sections[location.pathname.split('/')[2]]||'orders',action:'view'});if(active)setState(error?'error':data?'allowed':'denied')}catch{if(active)setState('error')}}
  setState('loading');void check()
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>setTimeout(()=>void check(),0))
  const timer=setInterval(()=>void check(),60000)
  let idle=window.setTimeout(()=>void supabase.auth.signOut(),30*60*1000)
  const touch=()=>{clearTimeout(idle);idle=window.setTimeout(()=>void supabase.auth.signOut(),30*60*1000)}
  window.addEventListener('pointerdown',touch);window.addEventListener('keydown',touch)
  return()=>{active=false;subscription.unsubscribe();clearInterval(timer);clearTimeout(idle);window.removeEventListener('pointerdown',touch);window.removeEventListener('keydown',touch)}
 },[location.pathname])
 if(state==='loading')return <p role="status" className="p-12">Checking staff access…</p>
 if(state==='login')return <Navigate to="/admin/login" replace/>
 if(state==='allowed')return <>{children}</>
 return <main className="p-12 space-y-5"><h1>Admin access</h1><p role="alert">{state==='error'?'Staff access could not be verified. Apply the admin database migration and try again.':'Your account does not have permission to view this section.'}</p><Link to="/">Back to website</Link><button className="btn-secondary" onClick={()=>void supabase.auth.signOut()}>Sign out</button></main>
}
