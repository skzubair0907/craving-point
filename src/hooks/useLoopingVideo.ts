import { useEffect, useRef, useState } from 'react'

export function useLoopingVideo(autoplay: boolean) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const userPaused = useRef(false)

  useEffect(() => {
    const element = video.current
    if (!element) return
    if (!autoplay) element.pause()
    let visible = false
    const sync = () => {
      if (!visible || document.hidden) element.pause()
      else if (autoplay && !userPaused.current) void element.play().catch(() => setPlaying(false))
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    }, { threshold: .1 })
    observer.observe(element)
    element.addEventListener('play', onPlay)
    element.addEventListener('pause', onPause)
    document.addEventListener('visibilitychange', sync)
    return () => {
      observer.disconnect()
      element.removeEventListener('play', onPlay)
      element.removeEventListener('pause', onPause)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [autoplay])

  const toggle = () => {
    const element = video.current
    if (!element) return
    userPaused.current = !element.paused
    if (userPaused.current) element.pause()
    else void element.play().catch(() => setPlaying(false))
  }
  return { video, playing, toggle }
}
