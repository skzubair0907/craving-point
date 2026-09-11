import { useEffect, useRef, useState } from 'react'

export function useQuality() {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('low')
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => {
      const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
      setQuality(motion.matches || device.connection?.saveData ? 'low' : !pointer.matches || (device.deviceMemory || 8) < 4 || navigator.hardwareConcurrency < 4 ? 'medium' : 'high')
    }
    update(); motion.addEventListener('change', update); pointer.addEventListener('change', update)
    return () => { motion.removeEventListener('change', update); pointer.removeEventListener('change', update) }
  }, [])
  return quality
}

export function useDepth<T extends HTMLElement>(strength = 1) {
  const ref = useRef<T>(null)
  const quality = useQuality()
  useEffect(() => {
    const element = ref.current
    if (!element || quality !== 'high') return
    let frame = 0, x = 0, y = 0, tx = 0, ty = 0
    const tick = () => {
      x += (tx - x) * .09; y += (ty - y) * .09
      element.style.setProperty('--mx', String(x * strength))
      element.style.setProperty('--my', String(y * strength))
      if (Math.abs(tx - x) + Math.abs(ty - y) > .001) frame = requestAnimationFrame(tick)
      else frame = 0
    }
    const start = () => { if (!frame) frame = requestAnimationFrame(tick) }
    const move = (e: PointerEvent) => { const r = element.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width * 2 - 1; ty = (e.clientY - r.top) / r.height * 2 - 1; start() }
    const leave = () => { tx = 0; ty = 0; start() }
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave)
    return () => { cancelAnimationFrame(frame); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); element.style.removeProperty('--mx'); element.style.removeProperty('--my') }
  }, [quality, strength])
  return ref
}
