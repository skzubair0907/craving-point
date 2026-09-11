import { MessageCircle } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'

const FloatingWhatsApp = () => {
  const { restaurantSettings } = useRestaurantData()
  const number = restaurantSettings.whatsapp_number || '917021235530'
  const url = `https://wa.me/${number}?text=${encodeURIComponent('Hi! I would like to place an order.')}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Order on WhatsApp"
      className="hidden md:flex fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_6px_24px_rgba(37,211,102,0.45)] transition-all hover:scale-110 hover:shadow-[0_8px_32px_rgba(37,211,102,0.6)] md:bottom-8"
    >
      <MessageCircle size={26} />
    </a>
  )
}

export default FloatingWhatsApp

