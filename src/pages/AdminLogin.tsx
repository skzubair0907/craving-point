import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { adminAuthError } from '../lib/adminAuthError'
export default function AdminLogin() {
 const navigate=useNavigate()
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 useEffect(()=>{if(!isSupabaseConfigured)return;const {data:{subscription}}=supabase.auth.onAuthStateChange((event:string)=>{if(event==='PASSWORD_RECOVERY')setMode('reset')});return()=>subscription.unsubscribe()},[])
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('');const v=new FormData(e.currentTarget);try{
 if(mode==='forgot'){const {error}=await supabase.auth.resetPasswordForEmail(String(v.get('email')),{redirectTo:window.location.origin+'/admin/login'});if(error)throw error;setMessage('If this email has an account, a reset link will arrive shortly.')}
 else if(mode==='reset'){const {error}=await supabase.auth.updateUser({password:String(v.get('password'))});if(error)throw error;await supabase.auth.signOut();setMode('login');setMessage('Password updated. Sign in again.')}
 else{const {error}=await supabase.auth.signInWithPassword({email:String(v.get('email')).trim(),password:String(v.get('password'))});if(error)throw error;navigate('/admin',{replace:true})}
 }catch(error){setMessage(adminAuthError(error))}finally{setBusy(false)}}
 return <main className="min-h-screen grid place-items-center p-6 bg-[#120f10] text-white"><section className="w-full max-w-md space-y-6 rounded-2xl border border-white/15 p-8"><img src="/images/logo.jpg" alt="Craving Point" className="w-20 rounded-lg"/><p className="text-primary">RESTAURANT ADMINISTRATION</p><h1 className="text-3xl font-bold">{mode==='login'?'Staff sign in':mode==='forgot'?'Reset your password':'Set a new password'}</h1>{!isSupabaseConfigured?<p role="status">Admin access is not configured yet. Connect the restaurant’s Supabase project to enable secure staff sign in.</p>:<form onSubmit={submit} className="grid gap-4">{mode!=='reset'&&<label>Email<input name="email" type="email" autoComplete="username" required className="admin-input w-full"/></label>}{mode!=='forgot'&&<label>Password<input name="password" type="password" minLength={mode==='reset'?12:1} autoComplete={mode==='reset'?'new-password':'current-password'} required className="admin-input w-full"/></label>}<button className="btn-primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':mode==='forgot'?'Send reset link':'Save password'}</button><button type="button" onClick={()=>setMode(mode==='login'?'forgot':'login')}>{mode==='login'?'Forgot password?':'Back to sign in'}</button></form>}{message&&<p role="status">{message}</p>}<Link to="/" className="block text-primary">Back to website</Link></section></main>
}
