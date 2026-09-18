function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export async function registerPush(userIdOrOrder?: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw-push.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const vapidKey = (import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY || '') as string
    if (!vapidKey) return null
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
    // Send subscription to serverless function
    await fetch('/.netlify/functions/push-subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub, user_id: userIdOrOrder || null, order_number: userIdOrOrder || null })
    })
    return sub
  } catch (e) {
    return null
  }
}

export default registerPush
