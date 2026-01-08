
const CACHE_NAME = 'nexapme-v1.1';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './types.ts',
  './constants.ts'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.warn('SW: Caching during install failed', err);
      })
  );
});

self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes vers l'API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(() => {
          // Fallback en cas d'échec du fetch (offline)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
