import { randomId } from '../lib/randomId'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
export type OrderRow = { id: string; order_number: string; created_at: string; payload: any }
export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const requestVersion = useRef(0)
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    try {
      const { data, error } = await supabase.from('order_requests').select('id,order_number,created_at,payload').order('created_at', { ascending: false }).limit(1000)
      if (error) throw error
      if (version !== requestVersion.current) return
      setOrders(data || []); setError('')
    } catch (error) { if (version === requestVersion.current) setError(error instanceof Error ? error.message : 'Unable to load orders.') }
    finally { if (version === requestVersion.current) setLoading(false) }
  }, [])
  useEffect(() => {
    void refresh()
    let active = true
    let debounce: ReturnType<typeof setTimeout> | undefined
    const changed = () => {
      if (!active) return
      clearTimeout(debounce)
      debounce = setTimeout(() => { if (active) void refresh() }, 100)
    }
    const channel = supabase.channel('admin-orders-' + randomId())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, changed)
      .subscribe((status: string) => { if (status === 'SUBSCRIBED') changed() })
    const visible = () => { if (document.visibilityState === 'visible') changed() }
    window.addEventListener('focus', changed)
    window.addEventListener('online', changed)
    document.addEventListener('visibilitychange', visible)
    // Also works automatically when Realtime is unavailable or not enabled yet.
    const timer = setInterval(() => { if (document.visibilityState === 'visible') changed() }, 5000)
    return () => {
      active = false
      requestVersion.current += 1
      clearTimeout(debounce)
      clearInterval(timer)
      window.removeEventListener('focus', changed)
      window.removeEventListener('online', changed)
      document.removeEventListener('visibilitychange', visible)
      void supabase.removeChannel(channel)
    }
  }, [refresh])
  return { orders, error, loading, refresh }
}
