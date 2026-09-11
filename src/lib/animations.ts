import gsap from 'gsap'

export function animateAddToCart(imageEl: HTMLImageElement | null, cartSelector = '.cart-pill') {
  return new Promise<void>((resolve) => {
    if (!imageEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resolve()
      return
    }

    const cartEl = Array.from(document.querySelectorAll(cartSelector)).find(element => element.getBoundingClientRect().width > 0) as HTMLElement | null
    const rect = imageEl.getBoundingClientRect()
    const clone = imageEl.cloneNode(true) as HTMLImageElement
    clone.style.position = 'fixed'
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.zIndex = '9999'
    clone.style.pointerEvents = 'none'
    clone.style.borderRadius = '12px'
    document.body.appendChild(clone)

    const targetRect = cartEl ? cartEl.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 40, height: 40 }

    gsap.to(clone, {
      duration: 0.8,
      left: targetRect.left + targetRect.width / 2 - rect.width * 0.18,
      top: targetRect.top + targetRect.height / 2 - rect.height * 0.18,
      width: rect.width * 0.36,
      height: rect.height * 0.36,
      ease: 'power3.inOut',
      opacity: 0.9,
      onComplete: () => {
        gsap.to(clone, { duration: 0.18, opacity: 0, scale: 0.1, onComplete: () => { clone.remove(); resolve(); } })
      },
    })
  })
}

export default animateAddToCart
