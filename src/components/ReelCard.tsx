import React from 'react'
import { Play, Instagram } from 'lucide-react'

const ReelCard: React.FC<{ reelUrl: string; poster: string }> = ({ reelUrl, poster }) => {
  return (
    <section className="section-shell py-16">
      <div className="mb-8 text-center">
        <p className="eyebrow">See Craving Point in Action</p>
        <h2 className="section-title">From our Instagram</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.6fr_0.4fr] items-center">
        <a href={reelUrl} target="_blank" rel="noreferrer" className="relative block rounded-[24px] overflow-hidden shadow-2xl">
          <img src={poster} alt="Craving Point reel poster" className="w-full h-[620px] object-cover" />
          <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-keep-white">FROM OUR INSTAGRAM</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition-transform hover:scale-105">
              <Play size={34} className="text-keep-white" />
            </div>
          </div>
        </a>

        <div className="p-6">
          <h3 className="text-4xl font-black text-white mb-4">CRAVING POINT</h3>
          <p className="text-lg text-white/70 mb-6">Good food. Good mood. Every craving has a place.</p>

          <div className="flex gap-4">
            <a href={reelUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
              <Instagram size={16} /> Follow Us
            </a>
            <a href={reelUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2">
              View More
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ReelCard
