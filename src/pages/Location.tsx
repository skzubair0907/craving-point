import React from 'react'
import { MapPin, Navigation, Clock3 } from 'lucide-react'
import { useRestaurantData } from '../store/useRestaurantData'

const LocationPage = () => {
  const { restaurantSettings } = useRestaurantData()
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <p className="uppercase tracking-[0.35em] text-xs font-black text-primary">Location</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-black text-[#1b1b1b]">Find us</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-[#e8d8a8] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <iframe
            title="Craving Point Map"
            src="https://www.google.com/maps?q=Cheeta+Camp+Trombay+Mumbai&output=embed"
            className="h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="rounded-[2rem] border border-[#e8d8a8] bg-[#fffaf0] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <h2 className="text-3xl font-black text-slate-800">Craving Point</h2>
          <div className="mt-6 space-y-5 text-slate-700">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 text-primary" size={20} />
              <p>{restaurantSettings.address}</p>
            </div>
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 text-primary" size={20} />
              <p>{restaurantSettings.opening_hours_label}</p>
            </div>
          </div>

          <a
            href="https://www.google.com/maps/search/?api=1&query=Craving+Point+Cheeta+Camp+Trombay+Mumbai"
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#101010] px-6 py-3 text-sm font-black text-white transition hover:bg-primary"
          >
            <Navigation size={18} />
            Get directions
          </a>
        </div>
      </div>
    </div>
  )
}

export default LocationPage
