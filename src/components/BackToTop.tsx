import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

const BackToTop = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-40 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 backdrop-blur-md transition-all hover:border-primary/60 hover:text-primary md:bottom-24 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  )
}

export default BackToTop
