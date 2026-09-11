import { useEffect, useRef, type ReactNode } from 'react'
import { useQuality } from '../hooks/useExperience'

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const quality = useQuality()
  useEffect(() => {
    const el = ref.current
    if (!el || quality === 'low') return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); observer.disconnect() } }, { threshold: .08 })
    el.classList.add('will-reveal'); observer.observe(el)
    return () => { observer.disconnect(); el.classList.remove('will-reveal') }
  }, [quality])
  return <div ref={ref} className={`editorial-reveal ${className}`}>{children}</div>
}
