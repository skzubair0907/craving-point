import React, { useEffect, useRef, useState } from 'react'

const Hero3D: React.FC<{
  images: string[]
  videoSrc?: string
}> = ({ images, videoSrc = '/shawarma.mp4' }) => {
  const [isClient, setIsClient] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const pointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    setIsClient(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const showVideo = isClient && !reducedMotion

  return (
    <div
      className="food-scene__canvas"
      onMouseMove={(e) => {
        if (!showVideo) return
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width - 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5
        pointer.current.x = x * 2
        pointer.current.y = y * -1
      }}
      onMouseLeave={() => {
        pointer.current = { x: 0, y: 0 }
      }}
    >
      {showVideo ? (
        <div
          className="relative h-full w-full overflow-hidden"
          style={{
            transform: `translate3d(${pointer.current.x * -8}px, ${pointer.current.y * -8}px, 0) scale(1.08)`,
            transition: 'transform 120ms ease-out',
          }}
        >
          <video
            className="h-full w-full object-cover"
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
      ) : (
        <img src={images[0]} alt="Craving Point food showcase" className="food-scene__fallback" loading="eager" />
      )}
    </div>
  )
}

export default Hero3D
