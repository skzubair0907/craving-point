self.addEventListener('push', function(event) {
  let data = {}
  try { data = event.data.json() } catch (e) { data = { title: 'Notification', body: event.data?.text() || '' } }
  const title = data.title || 'Craving Point'
  const options = { body: data.body || '', icon: '/images/icon-192.png', badge: '/images/icon-72.png', data: data }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
    if (windowClients.length > 0) return windowClients[0].focus()
    return clients.openWindow('/')
  }))
})
