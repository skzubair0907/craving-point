import React, { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const HeroScroll: React.FC<{ cameraRef?: React.MutableRefObject<any | null> }> = ({ cameraRef }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    if ('ontouchstart' in window && window.innerWidth < 768) return

    const ctx = gsap.context(() => {
      const hero = document.querySelector('.hero-shell') as HTMLElement | null
      const scene = document.querySelector('.food-scene') as HTMLElement | null

      if (!hero || !scene) return

      // Subtle lift + scale of the food scene as the user scrolls away
      gsap.to(scene, {
        y: -110,
        scale: 1.04,
        opacity: 0.85,
        ease: 'power1.out',
        transformOrigin: '50% 50%',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top+=140',
          scrub: 0.6,
        },
      })

      const heroText = document.querySelector('.hero-text') as HTMLElement | null
      if (heroText) {
        gsap.to(heroText, {
          y: -50,
          opacity: 0.4,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top+=140',
            scrub: 0.6,
          },
        })
      }

      if (cameraRef && cameraRef.current) {
        gsap.to(cameraRef.current.position, {
          z: 3.2,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top+=140',
            scrub: 0.6,
          },
        })
      }
    })

    return () => ctx.revert()
  }, [cameraRef])

  return null
}

export default HeroScroll