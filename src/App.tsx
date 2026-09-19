import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import CustomerSignInPrompt from './components/CustomerSignInPrompt'
import Metadata from './components/Metadata'
import Footer from './components/Footer'
import CustomCursor from './components/CustomCursor'
import Home from './pages/Home'
import LegalPage from './pages/LegalPage'
import AdminDispatch from './pages/AdminDispatch'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderTracking from './pages/OrderTracking'
import DeliveryTracking from './pages/DeliveryTracking'
import DeliveryPartner from './pages/DeliveryPartner'
import Account from './pages/Account'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import AdminOperations from './pages/AdminOperations'
import AdminReports from './pages/AdminReports'
import AdminMenuManagement from './pages/AdminMenuManagement'
import AdminCategoryManagement from './pages/AdminCategoryManagement'
import AdminOrdersManagement from './pages/AdminOrdersManagement'
import AdminSettings from './pages/AdminSettings'
import AdminGuard from './components/AdminGuard'
import AdminSidebar from './components/AdminSidebar'
import ProductDetail from './pages/ProductDetail'
import AdminCustomers from './pages/AdminCustomers'
import AdminCoupons from './pages/AdminCoupons'
import AdminReviews from './pages/AdminReviews'
import { MapPin, Clock3, ChevronRight } from 'lucide-react'
import FloatingWhatsApp from './components/FloatingWhatsApp'
import StickyBottomBar from './components/StickyBottomBar'
import BackToTop from './components/BackToTop'
import AppInstallPrompt from './components/AppInstallPrompt'
import LocationPermissionPrompt from './components/LocationPermissionPrompt'
import { useRestaurantData, useLiveRestaurant } from './store/useRestaurantData'
import clsx from 'clsx'

const OffersPage = () => {
  const { coupons, restaurantSettings } = useRestaurantData()
  return <div className="section-shell py-12"><p className="eyebrow">A little extra value</p><h1 className="section-title mb-8">Current offers</h1><div className="grid gap-5 md:grid-cols-3">{coupons.filter(c => c.active).map(c => <div key={c.code} className="card-premium p-6"><p className="text-primary font-black text-3xl">{c.type === 'fixed' ? '₹' + c.value : c.value + '%'} off</p><h2 className="mt-4 text-xl font-bold">Use code {c.code}</h2><p className="my-4 text-accent/60">{c.minimum > 0 ? 'On item subtotals of ₹' + c.minimum + ' or more.' : 'Apply this code in your cart.'} One coupon per order.</p><Link to="/menu" className="btn-secondary">Browse menu</Link></div>)}</div><p className="mt-8 text-accent/60">{restaurantSettings.delivery_available !== false ? 'Free delivery on orders above ₹' + restaurantSettings.free_delivery_above + '.' : 'Pickup available at the restaurant.'}</p></div>
}

const AboutPage = () => {
  const { restaurantSettings } = useRestaurantData()
  return (
  <div className="mx-auto max-w-5xl px-4 py-20">
    <div className="mb-10 text-center">
      <p className="eyebrow">About us</p>
      <h1 className="section-title">Local flavor. Fast service. Real comfort.</h1>
    </div>
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="glass-card p-8">
        <p className="text-base leading-8 text-white/80">
          Craving Point is a fast-food destination built for convenience, freshness, and satisfying cravings in Cheeta Camp, Trombay.
          We focus on quick service, hot food, and a welcoming atmosphere that makes every visit feel easy and enjoyable.
        </p>
        <div className="mt-6 flex items-center gap-3 text-primary">
          <Clock3 size={18} />
          <span className="font-semibold">{restaurantSettings.opening_hours_label}</span>
        </div>
      </div>
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 text-primary">
          <MapPin size={18} />
          <span className="font-bold uppercase tracking-[0.2em] text-xs">Location</span>
        </div>
        <p className="mt-4 text-lg font-semibold text-white">{restaurantSettings.address}</p>
      </div>
    </div>
  </div>
)}

const LocationPage = () => {
  const { restaurantSettings } = useRestaurantData()
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-10 text-center">
        <p className="eyebrow">Find us</p>
        <h1 className="section-title">Find Us</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card overflow-hidden rounded-3xl p-2 shadow-2xl shadow-black/30">
          <iframe
            title="Craving Point location map"
            width="100%"
            height="350"
            style={{ border: 0, borderRadius: '1rem' }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Craving%20Point%20Cheeta%20Camp%20Trombay%20Mumbai%20400088&output=embed"
            className="w-full rounded-2xl border-0"
          />
        </div>

        <div className="glass-card p-8">
          <h3 className="text-2xl font-black text-white">Craving Point</h3>
          <p className="mt-4 text-white/80 leading-7">
            SHOP NO. 29, F-SECTOR, Cheeta Camp Rd, near Noor Masjid, Cheeta Camp, Trombay, Mumbai, Maharashtra 400088
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <p className="mb-2 font-black uppercase tracking-[0.18em] text-xs text-white">Opening Hours</p>
            <p>{restaurantSettings.opening_hours_label}</p>
          </div>
          <a
            href={restaurantSettings.google_maps_url}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            Get Directions
          </a>
          {restaurantSettings.phone && (
            <a
              href={`https://wa.me/${restaurantSettings.whatsapp_number || '917021235530'}?text=${encodeURIComponent('Hi! I would like to place an order.')}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary mt-3 inline-flex w-full items-center justify-center gap-2"
            >
              Order on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

const AdminLayout = () => {
  return (
    <div className="admin-layout flex flex-col md:flex-row min-h-screen bg-[#120f10] text-white">
      <AdminSidebar />
      <div className="admin-content min-w-0 flex-grow overflow-x-auto">
        <Outlet />
      </div>
    </div>
  )
}

const RouteScroll = () => {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])
  return null
}
const MainLayout = () => (
  <div className="flex min-h-screen flex-col bg-[var(--brand-bg)] text-white">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-primary focus:p-4">Skip to content</a>
    <Navbar />
    <CustomerSignInPrompt />
    <CustomCursor />

    <main id="main-content" className="flex-grow pt-[72px] md:pt-[88px]">
      <Outlet />
    </main>
    <Footer />
    <FloatingWhatsApp />
    <BackToTop />
    <StickyBottomBar />
    <AppInstallPrompt />
  </div>
)

const App = () => {
  useLiveRestaurant()
  return (
    <Router>
      <RouteScroll />
      <Metadata />
      <LocationPermissionPrompt />
      <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="menu" element={<Menu />} />
            <Route path="menu/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-confirmation" element={<OrderConfirmation />} />
            <Route path="order-tracking" element={<OrderTracking />} />
            <Route path="delivery-tracking/:orderId?" element={<DeliveryTracking />} />
            <Route path="account" element={<Account />} />
            <Route path="privacy" element={<LegalPage kind="privacy" />} />
            <Route path="terms" element={<LegalPage kind="terms" />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="location" element={<LocationPage />} />
            <Route path="contact" element={<LocationPage />} />
            <Route path="*" element={<div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="section-title">Page not found</h1><Link to="/menu" className="btn-primary mt-6">Browse menu</Link></div>} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/delivery-partner" element={<DeliveryPartner />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route path="reports" element={<AdminReports/>}/>
            <Route path="delivery" element={<AdminDispatch/>}/>{(['inventory','support','staff','audit','notifications'] as const).map(kind=><Route key={kind} path={kind} element={<AdminOperations kind={kind}/>} />)}
            <Route index element={<AdminDashboard />} />
            <Route path="menu" element={<AdminMenuManagement />} />
            <Route path="categories" element={<AdminCategoryManagement />} />
            <Route path="orders" element={<AdminOrdersManagement />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
      </Routes>
    </Router>
  )
}

export default App
