/* ==========================================================================
   Service Worker — Taxi-Moto (PWA)
   Stratégie :
     - /images/ et polices  → Cache First (contenus stables, gain réseau)
     - le reste (JS/CSS)    → Network First (fraîcheur prioritaire)
     - navigations          → RÉSEAU uniquement : on ne met JAMAIS index.html
                              en cache, sinon les mises à jour sont bloquées.
   ⚠️ Aucune mise en cache des requêtes cross-origin (tuiles OSM, Google Fonts).
   ========================================================================== */

const VERSION = 'v1';
const IMAGE_CACHE = `taxi-moto-images-${VERSION}`;
const RUNTIME_CACHE = `taxi-moto-runtime-${VERSION}`;

/** Cache First : on sert le cache, sinon on va au réseau et on stocke. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

/** Network First : on tente le réseau, on retombe sur le cache si hors ligne. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('install', () => {
  // Active immédiatement la nouvelle version du SW.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge des anciens caches (versions précédentes).
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== IMAGE_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que les GET.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jamais de cache pour le cross-origin (tuiles, fonts distantes, etc.).
  if (url.origin !== self.location.origin) return;

  // Navigations : réseau pur → index.html toujours frais (mises à jour OK).
  if (request.mode === 'navigate') return;

  // Cache First : images.
  if (request.destination === 'image' || url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Cache First : polices.
  if (request.destination === 'font' || /\.(woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Network First : JS, CSS et le reste.
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});
