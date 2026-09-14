/* ==========================================================================
   Service Worker — Taxi-Moto (PWA + Firebase Cloud Messaging)
   Stratégie :
     - /images/ et polices  → Cache First (contenus stables, gain réseau)
     - le reste (JS/CSS)    → Network First (fraîcheur prioritaire)
     - navigations          → RÉSEAU uniquement : on ne met JAMAIS index.html
                              en cache, sinon les mises à jour sont bloquées.
   ⚠️ Aucune mise en cache des requêtes cross-origin (tuiles OSM, Google Fonts).

   + NOTIFICATIONS PUSH (FCM) : voir le bloc en fin de fichier. Le Service
     Worker reçoit les pushs même QUAND L'APP EST FERMÉE et affiche la
     notification système (clic → focus sur l'app + navigation).
   ========================================================================== */

const VERSION = 'v2';
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

/* ==========================================================================
   FIREBASE CLOUD MESSAGING (notifications push conducteur)
   ==========================================================================
   ⚠️ Ce fichier est STATIQUE (servi depuis /public) : il ne peut pas lire les
   variables `VITE_*`. La configuration Firebase est donc écrite ici. Ce sont
   des clés WEB PUBLIQUES par conception (elles identifient le projet, elles ne
   signent rien) — la sécurité repose sur les règles Firestore / RTDB.
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBIZlTTayXQecvp6VRAQu219Ii1xbAjss4',
  authDomain: 'taxi-moto-68e6b.firebaseapp.com',
  projectId: 'taxi-moto-68e6b',
  storageBucket: 'taxi-moto-68e6b.firebasestorage.app',
  messagingSenderId: '711711558039',
  appId: '1:711711558039:web:58dbd8feb2bf21c9275cd2',
};

let fcmMessaging = null;

try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

  if (self.firebase && typeof self.firebase.initializeApp === 'function') {
    self.firebase.initializeApp(FIREBASE_CONFIG);
    fcmMessaging = self.firebase.messaging();
  }
} catch (error) {
  // Hors ligne / CDN bloqué : le SW continue d'assurer le cache PWA.
  console.warn('[sw] Firebase Messaging indisponible :', error);
}

/** Affiche la notification système d'une nouvelle course. */
function showRideNotification(payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || '🚨 Nouvelle course';
  const body = notification.body || '';

  return self.registration.showNotification(title, {
    body,
    icon: '/images/icon.png',
    badge: '/images/favicon.png',
    // Une demande = une notification (pas d'empilement).
    tag: data.requestId ? `taxi-ride-${data.requestId}` : 'taxi-ride',
    // Reste à l'écran jusqu'à ce que le conducteur la traite (Android).
    requireInteraction: true,
    vibrate: [450, 150, 450, 150, 600, 700],
    data: { url: data.url || '/driver', requestId: data.requestId || '' },
  });
}

if (fcmMessaging) {
  fcmMessaging.onBackgroundMessage((payload) => {
    /*
     * ⚠️ Un message contenant un bloc « notification » est DÉJÀ affiché par le
     * SDK FCM : on n'ajoute notre affichage que pour les messages « data-only »,
     * sinon la notification apparaîtrait deux fois.
     */
    if (payload.notification) return undefined;

    return showRideNotification(payload);
  });
}

/* Clic sur une notification : focus sur l'app ouverte, sinon ouverture. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const path = typeof data.url === 'string' && data.url ? data.url : '/driver';
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        // On ne réutilise qu'une fenêtre de NOTRE application.
        if (!client.url.startsWith(self.location.origin)) continue;

        if ('focus' in client) await client.focus();

        // App ouverte sur un autre écran → on la ramène sur le Dashboard.
        try {
          if (typeof client.navigate === 'function') {
            const current = new URL(client.url).pathname;
            if (current !== path) await client.navigate(target);
          }
        } catch (error) {
          console.warn('[sw] navigation impossible :', error);
        }

        return;
      }

      // Aucune fenêtre ouverte : on lance l'app sur le bon écran.
      await self.clients.openWindow(target);
    })(),
  );
});


