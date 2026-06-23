/* Service Worker — El sazón de JASU
   Cachea la app para que funcione 100% offline. */

const CACHE = 'jasu-cache-v2';
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
  './js/lock.js',
  './js/settings.js',
  './js/app.js',
  './icons/icon.svg'
];

// Instalación: precachea los archivos base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
