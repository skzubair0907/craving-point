import { useEffect, useRef } from 'react'

let activeScrollLocks = 0
let originalOverflow = ''

function queryFocusable(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[]
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  )
  return Array.from(focusable).filter((el) => !el.hasAttribute('disabled'))
}

export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, enabled = true, onClose?: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!enabled) return
    const node = ref.current
    if (!node) return

    if (activeScrollLocks === 0) originalOverflow = document.body.style.overflow
    activeScrollLocks += 1
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = queryFocusable(node)
    if (focusable.length) focusable[0].focus()

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
      }
      if (e.key === 'Tab') {
        const items = queryFocusable(node)
        if (items.length === 0) {
          e.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
      activeScrollLocks -= 1
      if (activeScrollLocks === 0) document.body.style.overflow = originalOverflow
      if (activeScrollLocks === 0 && previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [ref, enabled])
}

export default useFocusTrap

