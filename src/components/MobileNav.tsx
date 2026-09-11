import React from 'react'
import { Home as HomeIcon, UtensilsCrossed, ReceiptText, User, ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useCartStore } from '../store/useCartStore'

const items = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Menu', path: '/menu', icon: UtensilsCrossed },
  { name: 'Orders', path: '/order-tracking', icon: ReceiptText },
  { name: 'Account', path: '/account', icon: User },
  { name: 'Cart', path: '/cart', icon: ShoppingBag },
]

const MobileNav: React.FC = () => {
  const location = useLocation()
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  if (location.pathname.startsWith('/admin')) return null

  return (
    <nav className="mobile-nav md:hidden" aria-label="Primary mobile navigation">
      {items.map((item) => {
        const Icon = item.icon
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
        return (
          <Link key={item.name} to={item.path} aria-current={active ? 'page' : undefined}>
            <span className="relative">
              <Icon size={20} strokeWidth={2.2} />
              {item.name === 'Cart' && count > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-[#1d1716]">
                  {count}
                </span>
              )}
            </span>
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default MobileNav