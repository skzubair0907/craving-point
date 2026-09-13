import { useEffect, useState } from 'react'
import { orderApi } from '../lib/orderApi'

export interface DeliveryTrackingData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: string // ISO timestamp
  riderId?: string
}

interface UseDeliveryTrackingResult {
  loading: boolean
  error: Error | null
  data: DeliveryTrackingData | null
  lastUpdated: string | null
}

/**
 * Hook to track real-time delivery rider location for a given order
 * @param orderId - The ID of the order to track
 * @returns Object containing loading state, error, tracking data, and last updated timestamp
 */
export function useDeliveryTracking(
  orderId: string,
  token: string
): UseDeliveryTrackingResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<DeliveryTrackingData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId || !token) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let active = true
    const refresh = async () => {
      try {
        const result = await orderApi('orderStatus', { orderId, token })
        const location = result.order?.deliveryLocation
        if (!active) return
        if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
          const next = {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy ?? undefined,
            timestamp: location.updated_at,
          }
          setData(next)
          setLastUpdated(next.timestamp)
        } else {
          setData(null)
          setLastUpdated(null)
        }
        setError(null)
      } catch {
        if (active) setError(new Error('Live rider location is unavailable.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    void refresh()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 15000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [orderId, token])

  return { loading, error, data, lastUpdated }
}
