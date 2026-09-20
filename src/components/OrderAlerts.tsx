import { useEffect, useRef, useState } from 'react'
import { BellRing, Volume2, VolumeX } from 'lucide-react'
import type { OrderRow } from '../hooks/useAdminOrders'

const preferenceKey = 'craving-point-admin-order-sound'

function getAudioContext() {
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AudioContextConstructor ? new AudioContextConstructor() : null
}

export default function OrderAlerts({ orders, loading }: { orders: OrderRow[]; loading: boolean }) {
  const seen = useRef<Set<string> | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const [enabled, setEnabled] = useState(() => localStorage.getItem(preferenceKey) === 'true')
  const [message, setMessage] = useState('')

  const playChime = () => {
    const context = audio.current
    if (!context || context.state !== 'running') return false
    const now = context.currentTime
    ;[0, 0.19, 0.38].forEach((delay, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = index === 2 ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime([659, 880, 1319][index], now + delay)
      gain.gain.setValueAtTime(0.0001, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.13, now + delay + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now + delay)
      oscillator.stop(now + delay + 0.24)
    })
    return true
  }

  const notify = (count: number) => {
    const label = `${count} new order${count === 1 ? '' : 's'} received.`
    setMessage(label)
    playChime()
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Craving Point · New order', { body: label, icon: '/images/logo-new.png', tag: 'craving-point-order' })
    }
  }

  const enableSound = async () => {
    if (enabled) {
      setEnabled(false)
      localStorage.setItem(preferenceKey, 'false')
      setMessage('Order sound muted on this browser.')
      return
    }
    try {
      audio.current ??= getAudioContext()
      if (!audio.current) throw new Error('Audio is not supported')
      await audio.current.resume()
      if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
      setEnabled(true)
      localStorage.setItem(preferenceKey, 'true')
      playChime()
      setMessage('Order sound is on. You will hear a chime for each new order.')
    } catch {
      setMessage('Sound is blocked by this browser. Tap the button again after allowing sound for this site.')
    }
  }

  useEffect(() => () => { void audio.current?.close() }, [])
  useEffect(() => {
    if (loading) return
    const active = orders.filter(row => !['awaiting_payment', 'cancelled'].includes(String(row.payload?.status || '')))
    const ids = new Set(active.map(row => row.id))
    if (seen.current) {
      const count = active.filter(row => !seen.current!.has(row.id)).length
      if (count && enabled) notify(count)
    }
    seen.current = ids
  }, [orders, loading, enabled])

  return <section className="order-alerts" aria-label="New order alerts">
    <div className="order-alerts-icon" aria-hidden="true"><BellRing size={20} /></div>
    <div className="order-alerts-copy"><strong>{enabled ? 'Order sound is on' : 'New order sound'}</strong><span>{enabled ? 'Live sound alerts are ready for incoming orders.' : 'Enable sound to hear every new customer order.'}</span></div>
    <div className="order-alerts-actions"><button type="button" className={enabled ? 'btn-secondary' : 'btn-primary'} onClick={() => void enableSound()}>{enabled ? <VolumeX size={16} /> : <Volume2 size={16} />}{enabled ? 'Mute order sound' : 'Enable order sound'}</button>{enabled && <button type="button" className="btn-secondary" onClick={() => { if (playChime()) setMessage('Test chime played.') }}>Test sound</button>}</div>
    <p className="order-alerts-status" role="status" aria-live="polite">{message || 'Keep this admin page open for live alerts.'}</p>
  </section>
}
