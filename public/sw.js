/* Minimal fallback Service Worker for offline-first. */
const CACHE_NAME = 'minimal-idea-spark-v1';
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html', '/manifest.json', '/favicon.ico', '/pwa-192x192.png', '/pwa-512x512.png']);
    })
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith('http') && !event.request.url.includes('/api/')) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((r) => r)));
  }
});
