/* eslint-disable no-restricted-globals */
// POS Restaurante - Service Worker
// Caches the app shell so it loads offline. API requests are NEVER cached
// (we want fresh data) — they fail gracefully so the app can queue them.

const CACHE = 'pos-shell-v1';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Never intercept API requests — let them fail naturally if offline
  if (url.pathname.startsWith('/api/')) return;

  // Don't cache POST etc.
  if (req.method !== 'GET') return;

  // Network-first for navigation requests, fallback to cached app shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images)
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp.ok && (url.origin === self.location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});

// Listen for messages from the app (e.g., trigger sync)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
