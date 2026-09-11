import React from 'react'
import { Clock3, MapPin, Sparkles, UtensilsCrossed } from 'lucide-react'

const AboutPage = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <p className="uppercase tracking-[0.35em] text-xs font-black text-primary">About us</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-black text-[#1b1b1b]">Craving Point</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-center">
        <div className="rounded-[2rem] border border-[#f4d8a1] bg-[#fffaf0] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.08)]">
          <p className="text-lg leading-8 text-slate-700">
            Craving Point is a local fast-food restaurant built around convenience, flavor, and a warm customer experience.
            From quick bites to satisfying family meals, every order is prepared fresh with care and served with energy.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature icon={<UtensilsCrossed size={20} />} label="Fresh preparation" />
            <Feature icon={<Sparkles size={20} />} label="Fast service" />
            <Feature icon={<MapPin size={20} />} label="Local favorite" />
            <Feature icon={<Clock3 size={20} />} label="Daily service" />
          </div>
        </div>

        <div className="relative h-[420px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#101010] via-[#1a1a1a] to-[#3c120d] p-6">
          <div className="restaurant-card-visual">
            <div className="restaurant-card-visual__facade">
              <div className="restaurant-card-visual__sign">CRAVING POINT</div>
              <div className="restaurant-card-visual__counter" />
              <div className="restaurant-card-visual__window" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Feature = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#f3d783] bg-white p-3 text-sm font-bold text-slate-700">
    <span className="rounded-full bg-[#ffe08c] p-2 text-[#a15b00]">{icon}</span>
    {label}
  </div>
)

export default AboutPage
