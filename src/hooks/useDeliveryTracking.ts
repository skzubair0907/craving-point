import { useEffect, useState } from 'react'
import { orderApi } from '../lib/orderApi'
import { supabase } from '../lib/supabase'

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
  token?: string
): UseDeliveryTrackingResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<DeliveryTrackingData | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let active = true
    const applyLocation = (location: any) => {
      if (!location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude))) return false
      const next = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        accuracy: location.accuracy == null ? undefined : Number(location.accuracy),
        timestamp: location.updated_at || location.timestamp || new Date().toISOString(),
        riderId: location.updated_by || location.riderId || undefined,
      }
      setData(next)
      setLastUpdated(next.timestamp)
      return true
    }
    const refresh = async () => {
      // Poll server-side orderStatus only when a tracking token is provided
      if (!token) return
      try {
        const result = await orderApi('orderStatus', { orderId, token })
        const location = result.order?.deliveryLocation
        if (!active) return
        if (!applyLocation(location)) {
          // don't clobber realtime data if present; only set null if no location present
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

    const refreshStaffLocation = async () => {
      if (token) return
      try {
        const result = await supabase
          .from('delivery_tracking')
          .select('latitude,longitude,accuracy,updated_at,updated_by')
          .eq('order_number', orderId)
          .maybeSingle()
        if (!active) return
        if (result.error) throw result.error
        if (!applyLocation(result.data)) {
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

    // start polling only when token is present
    if (token) {
      void refresh()
      var timer = window.setInterval(() => {
        if (document.visibilityState === 'visible') void refresh()
      }, 3000)
    } else {
      void refreshStaffLocation()
    }

    // subscribe to realtime updates for delivery_tracking row for this order number
    let channel: any = null
    try {
      channel = supabase.channel(`delivery_tracking_order_${orderId}`)
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_tracking', filter: `order_number=eq.${orderId}` },
        (payload: any) => {
          if (!active) return
          try {
            const rec = payload.new || payload.record || payload
            if (applyLocation(rec)) setError(null)
          } catch (e) {
            // ignore payload parse errors
          }
        }
      ).subscribe()
    } catch (e) {
      // no-op if realtime unsupported
    }

    return () => {
      active = false
      try { if (typeof timer !== 'undefined') window.clearInterval(timer) } catch (e) {}
      try { if (channel) supabase.removeChannel(channel) } catch (e) {}
    }
  }, [orderId, token])

  return { loading, error, data, lastUpdated }
}
