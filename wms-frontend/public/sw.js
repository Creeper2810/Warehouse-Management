// Minimal service worker: avoid caching auth/API endpoints; simple offline fallback for app shell
const CACHE_NAME = 'wms-static-v1'
const OFFLINE_URL = '/'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache basic shell (optional)
      return cache.addAll([OFFLINE_URL])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

// Helper to detect API or auth routes
function isApiRequest(url) {
  try {
    const u = new URL(url, self.location)
    return u.pathname.startsWith('/api') || u.pathname.startsWith('/sanctum')
  } catch (e) {
    return false
  }
}

self.addEventListener('fetch', event => {
  const req = event.request
  const url = req.url

  // Always forward API/auth requests to network (no-cache)
  if (isApiRequest(url)) {
    event.respondWith(fetch(req))
    return
  }

  // For navigation requests, try network then fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // For other requests, try cache first then network
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req)
    })
  )
})
