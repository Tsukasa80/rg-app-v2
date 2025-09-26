const CACHE_NAME = 'rgx-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './scripts/app.js',
  './scripts/state.js',
  './scripts/db.js',
  './scripts/data-service.js',
  './scripts/utils/date.js',
  './scripts/utils/dom.js',
  './scripts/ui/home.js',
  './scripts/ui/history.js',
  './scripts/ui/weekly.js',
  './scripts/ui/dashboard.js',
  './scripts/ui/settings.js',
  './scripts/ui/entry-modal.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => cachedFallback(request)))
  );
});

function cachedFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match('./index.html');
  }
  return Promise.resolve(new Response('オフラインです', { status: 503, statusText: 'Offline' }));
}
