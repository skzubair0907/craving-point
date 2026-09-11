import { useEffect, useState } from 'react'
import { useRestaurantData } from '../store/useRestaurantData'

export interface StatusResult {
  isOpen: boolean
  label: 'OPEN NOW' | 'CLOSED'
  orderingUnavailable: boolean
  nextOpenText: string
}

function minutesFromHhMm(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

export function useRestaurantStatus(enabled = true): StatusResult {
  const { restaurantSettings } = useRestaurantData()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [enabled])

  if (!enabled) {
    return { isOpen: false, label: 'CLOSED', orderingUnavailable: false, nextOpenText: '' }
  }

  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = days.indexOf(value('weekday'))
  const schedule = restaurantSettings.opening_hours.find((day) => day.day === days[today])
  const previous = restaurantSettings.opening_hours.find((day) => day.day === days[(today + 6) % 7])
  const nowMins = Number(value('hour')) * 60 + Number(value('minute'))
  const open = schedule ? minutesFromHhMm(schedule.open) : 1440
  const close = schedule ? minutesFromHhMm(schedule.close) : 0
  const previousClose = previous ? minutesFromHhMm(previous.close) : 0
  const isOpen = (nowMins >= open && (close <= open || nowMins < close)) ||
    Boolean(previous && previousClose <= minutesFromHhMm(previous.open) && nowMins < previousClose)

  const orderingUnavailable = !restaurantSettings.online_ordering_enabled

  return {
    isOpen,
    label: isOpen ? 'OPEN NOW' : 'CLOSED',
    orderingUnavailable,
    nextOpenText: restaurantSettings.opening_hours_label,
  }
}

export default useRestaurantStatus