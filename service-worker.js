/* Service Worker — El sazón de JASU
   Cachea la app para que funcione 100% offline. */

const CACHE = 'jasu-cache-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/db.js',
  './js/tips-data.js',
  './js/finance.js',
  './js/inventory.js',
  './js/sections.js',
  './js/tips.js',
  './js/notify.js',
  './js/notes.js',
  './js/lock.js',
  './js/settings.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './screenshots/screenshot-mobile.png',
  './screenshots/screenshot-wide.png'
];

// Instalación: precachea los archivos base (tolerante a fallos individuales)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpia versiones antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: cache-first con respaldo a red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});

// Al tocar una notificación de recordatorio: enfocar o abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
