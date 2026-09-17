const CACHE = 'craving-point-shell-v1'
const shell = ['/', '/manifest.webmanifest', '/images/logo-new.png']
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(shell)).then(() => self.skipWaiting())))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith(fetch(request).then(response => {
    if (response.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.mode === 'navigate')) {
      const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(request, copy))
    }
    return response
  }).catch(async () => (await caches.match(request)) || (request.mode === 'navigate' ? caches.match('/') : Response.error())))
})
