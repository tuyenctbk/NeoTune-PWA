// NeoTune Robust Service Worker for PWA (Android Chrome & iOS Safari optimized)
const CACHE_NAME = 'neotune-cache-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('SW pre-cache item note:', asset, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event handling:
// - Never touch API routes or audio stream downloads
// - Network-First for HTML/Navigation requests to ensure fresh site code on Android Chrome
// - Cache-First with fallback for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass service worker for non-http(s) schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Never intercept or cache live radio audio streams, podcasts, or backend API endpoints
  if (
    url.pathname.startsWith('/api/') ||
    request.headers.get('accept')?.includes('audio') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.aac') ||
    url.pathname.endsWith('.m3u8') ||
    url.hostname.includes('somafm.com') ||
    url.hostname.includes('radio-browser.info') ||
    url.hostname.includes('itunes.apple.com') ||
    url.hostname.includes('cloudfront.net')
  ) {
    return;
  }

  // Network-First for Page Navigation (HTML)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('/index.html') || caches.match('/'));
        })
    );
    return;
  }

  // Cache-First with Network Fallback for JS, CSS, fonts, SVG icons
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png'))
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
    })
  );
});

