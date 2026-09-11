import React, { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const VIDEO_SRC = '/videos/hero.mp4'
const POSTER = '/images/17.jpeg'

const HeroVideo = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [videoFailed, setVideoFailed] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, { stiffness: 130, damping: 22, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 130, damping: 22, mass: 0.6 })

  const rotateY = useTransform(springX, [-1, 1], [-3.5, 3.5])
  const rotateX = useTransform(springY, [-1, 1], [3, -3])
  const tiltZ = useTransform(springX, [-1, 1], [-0.8, 0.8])

  const foodX = useTransform(springX, [-1, 1], [-9, 9])
  const foodY = useTransform(springY, [-1, 1], [-7, 7])

  const bgX = useTransform(springX, [-1, 1], [7, -7])
  const bgY = useTransform(springY, [-1, 1], [5, -5])

  const fgX = useTransform(springX, [-1, 1], [-13, 13])
  const fgY = useTransform(springY, [-1, 1], [-10, 10])

  const glareX = useTransform(springX, [-1, 1], ['0%', '100%'])
  const glareBg = useTransform(
    glareX,
    (p) => `radial-gradient(420px circle at ${p} 30%, rgba(255,214,150,0.10), transparent 60%)`,
  )

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
    mouseX.set(nx)
    mouseY.set(ny)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  const handleVideoError = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    event.currentTarget.style.display = 'none'
    setVideoFailed(true)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="food-scene will-change-transform"
    >
      {/* Fallback poster if video cannot play (sits behind the video) */}
      <img
        src={POSTER}
        alt="Craving Point hero food"
        className={`food-scene__fallback ${videoFailed ? 'food-scene__fallback--show' : ''}`}
        aria-hidden
      />

      {/* Blurred background layer, moves opposite to cursor */}
      <motion.div
        aria-hidden
        style={{ x: bgX, y: bgY, scale: 1.08 }}
        className="food-scene__warm absolute inset-0"
      />

      {/* Food video layer with subtle 3D tilt + parallax */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          rotateZ: tiltZ,
          x: foodX,
          y: foodY,
          transformPerspective: 1100,
        }}
        className="absolute inset-0"
      >
        <motion.video
          src={VIDEO_SRC}
          poster={POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={handleVideoError}
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: [0.22, 0.61, 0.36, 1] }}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Foreground overlays floating slightly ahead (stronger parallax) */}
      <motion.div
        aria-hidden
        style={{ x: fgX, y: fgY }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0908]/60 via-transparent to-[#0e0908]/10" />
        <div className="absolute inset-0 rounded-[36px] ring-1 ring-inset ring-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 rounded-b-[36px] shadow-[0_-18px_50px_rgba(0,0,0,0.35)]" />
      </motion.div>

      {/* Interactive glare that follows the cursor */}
      <motion.div
        aria-hidden
        style={{ background: glareBg }}
        className="pointer-events-none absolute inset-0"
      />
    </div>
  )
}

export default HeroVideo