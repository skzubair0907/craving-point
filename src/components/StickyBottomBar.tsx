import { ArrowUpRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useCartStore } from '../store/useCartStore'
import { useUIStore } from '../store/useUIStore'
export default function StickyBottomBar(){
 const {pathname}=useLocation()
 const items=useCartStore(s=>s.items)
 const {isCartOpen,setCartOpen}=useUIStore()
 if(isCartOpen || ['/checkout','/cart','/order-confirmation','/order-tracking'].includes(pathname))return null
 const count=items.reduce((sum,item)=>sum+item.quantity,0)
 if(!count)return null
 const subtotal=items.reduce((sum,item)=>sum+item.quantity*item.price,0)
 return <div className="cp-bottom-bar fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] border-t border-white/10 bg-[#120d0c]/95 backdrop-blur-xl md:hidden"><div className="mx-auto flex max-w-lg p-3 gap-3"><button onClick={()=>setCartOpen(true)} className="mobile-view-cart"><span className="mobile-cart-count">{count}</span><span>View cart<small>Items subtotal {'\u20b9'}{subtotal.toFixed(2)}</small></span><ArrowUpRight size={22}/></button></div></div>
}
