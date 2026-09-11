import React from 'react'
import { Link } from 'react-router-dom'
import { useRestaurantData } from '../store/useRestaurantData'

const OffersPage = () => {
  const { offers } = useRestaurantData()
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <p className="uppercase tracking-[0.35em] text-xs font-black text-primary">Offers</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-black text-[#1b1b1b]">Fresh deals</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {offers.map((offer) => (
          <div key={offer.id} className="group overflow-hidden rounded-[2rem] border border-[#f4d7a1] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className={`bg-primary p-6 text-white`}>
              <p className="text-xs font-black uppercase tracking-[0.3em]">Craving deal</p>
              <h2 className="mt-4 text-3xl font-black">{offer.discount}</h2>
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-black text-slate-800">{offer.title}</h3>
              <p className="mt-3 text-base text-slate-600">{offer.description}</p>
              <Link to="/menu" className="mt-6 inline-flex rounded-full bg-[#1d1d1d] px-4 py-2 text-sm font-bold text-white transition hover:bg-primary">
                Explore deal
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OffersPage
