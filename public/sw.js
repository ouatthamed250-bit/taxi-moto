/* ==========================================================================
   Service Worker — Taxi-Moto (PWA + Firebase Cloud Messaging)
   Stratégie :
     - navigations (/admin, /driver, /…)  → RÉSEAU d'abord, puis copie de
       secours de la coquille SPA, puis page « hors ligne ».
       → l'index reste TOUJOURS frais en ligne (mises à jour jamais bloquées) :
         la copie de secours n'est utilisée QUE si le réseau échoue.
     - /images/ et polices                → Cache First (contenus stables)
     - le reste (JS/CSS)                  → Network First (fraîcheur prioritaire)
   ⚠️ Aucune mise en cache des requêtes cross-origin (tuiles OSM, Google Fonts).

   ⚠️ ROBUSTESSE : TOUTE requête interceptée renvoie une `Response` valide.
   Aucune promesse rejetée ne doit sortir de `respondWith()` — c'était la cause
   de la PAGE BLANCHE sur /admin quand le réseau tombait (« Failed to fetch »).

   + NOTIFICATIONS PUSH (FCM) : voir le bloc en fin de fichier.
   ========================================================================== */

const VERSION = 'v3';
const IMAGE_CACHE = `taxi-moto-images-${VERSION}`;
const RUNTIME_CACHE = `taxi-moto-runtime-${VERSION}`;
/** Cache des navigations : coquille SPA (secours) + page hors ligne. */
const NAV_CACHE = `taxi-moto-nav-${VERSION}`;

/**
 * Page de secours hors ligne (pré-cachée à l'installation).
 * URL ABSOLUE : `caches.match()` / `cache.put()` n'ont ainsi aucune ambiguïté.
 */
const OFFLINE_URL = new URL('/offline.html', self.location.origin).href;

/**
 * Copie de secours de la coquille SPA (`index.html`) — sert TOUTES les routes
 * (/admin, /driver…) puisqu'il s'agit d'une application monopage.
 *
 * ⚠️ Elle n'est JAMAIS servie en priorité : les navigations tentent d'abord le
 * réseau, donc un nouvel index est toujours servi quand on est en ligne (les
 * mises à jour ne sont donc jamais bloquées). Elle n'intervient qu'en DERNIER
 * recours (hors ligne) — c'est ce qui évite la page blanche.
 */
const SHELL_URL = new URL('/index.html', self.location.origin).href;

/* ========================== RÉPONSES DE SECOURS ========================== */
/*
 * Toutes ces fabriques sont SYNCHRONES et ne peuvent pas échouer : elles
 * constituent le dernier filet de sécurité du Service Worker.
 */

/** Réponse HTML minimale (jamais de promesse rejetée). */
function htmlResponse(body, status, statusText) {
  return new Response(body, {
    status,
    statusText,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/** Réponse texte minimale (assets indisponibles hors ligne). */
function textResponse(message, status, statusText) {
  return new Response(message, {
    status,
    statusText,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * Ultime recours : page « hors ligne » EN LIGNE DE CODE. Utilisée seulement si
 * `offline.html` n'est pas en cache et que le stockage est indisponible.
 */
function emergencyResponse() {
  return htmlResponse(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Hors ligne — Taxi-Moto</title></head>' +
      '<body style="margin:0;font-family:system-ui,sans-serif;background:#062b67;' +
      'color:#fff;display:flex;min-height:100vh;align-items:center;' +
      'justify-content:center;text-align:center;padding:24px">' +
      '<div><h1 style="margin:0 0 8px">Pas de connexion</h1>' +
      '<p style="opacity:.8;margin:0 0 20px">Vérifiez votre connexion internet puis réessayez.</p>' +
      '<button onclick="location.reload()" style="padding:14px 22px;border:0;' +
      'border-radius:12px;background:#ff9900;color:#062b67;font-weight:800;font-size:15px">' +
      'Réessayer</button></div></body></html>',
    503,
    'Service Unavailable',
  );
}

/** Page « hors ligne » : la copie en cache, sinon la version de secours. */
async function offlineResponse() {
  try {
    const cached = await caches.match(OFFLINE_URL);
    if (cached) return cached;
  } catch (error) {
    console.warn('[sw] offline.html illisible :', error);
  }

  return emergencyResponse();
}

/**
 * FILET DE SÉCURITÉ GLOBAL : enveloppe n'importe quelle stratégie pour
 * garantir qu'une `Response` valide est TOUJOURS renvoyée. C'est ce filet qui
 * empêche définitivement la page blanche.
 */
async function withFallback(strategy, fallback) {
  try {
    const response = await strategy();
    if (response) return response;
  } catch (error) {
    console.warn('[sw] stratégie en échec :', error);
  }

  try {
    return await fallback();
  } catch (error) {
    console.warn('[sw] secours en échec :', error);
    return emergencyResponse();
  }
}

/* ============================== STRATÉGIES ============================== */

/**
 * Cache First : le cache d'abord, puis le réseau (résultat mis en cache).
 * ⚠️ Ne rejette JAMAIS : en cas d'échec total, renvoie une 404 propre.
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);

    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());

    return response;
  } catch (error) {
    console.warn('[sw] cacheFirst en échec :', error);

    // Dernier recours : n'importe quel cache (l'asset a pu être stocké ailleurs).
    try {
      const elsewhere = await caches.match(request);
      if (elsewhere) return elsewhere;
    } catch {
      // stockage indisponible : on ignore
    }

    return textResponse('Ressource indisponible hors ligne.', 404, 'Not Found');
  }
}

/**
 * Network First : le réseau d'abord (fraîcheur), puis le cache hors ligne.
 * ⚠️ Ne rejette JAMAIS : en cas d'échec total, renvoie une 503 propre.
 */
async function networkFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        cache.put(request, response.clone());
        return response;
      }

      // Réponse HTTP en erreur (4xx / 5xx) : la version en cache est préférable.
      const cached = await cache.match(request);
      if (cached) return cached;

      return response;
    } catch (error) {
      console.warn('[sw] réseau indisponible (networkFirst) :', error);

      const cached = await cache.match(request);
      if (cached) return cached;

      const elsewhere = await caches.match(request);
      if (elsewhere) return elsewhere;

      return textResponse(
        'Hors ligne — vérifiez votre connexion internet.',
        503,
        'Service Unavailable',
      );
    }
  } catch (error) {
    // `caches.open()` a échoué : on tente quand même le réseau.
    console.warn('[sw] networkFirst en échec :', error);

    try {
      return await fetch(request);
    } catch {
      return textResponse(
        'Hors ligne — vérifiez votre connexion internet.',
        503,
        'Service Unavailable',
      );
    }
  }
}

/**
 * NAVIGATIONS (application monopage : /admin, /driver, /…).
 *
 *   1. RÉSEAU d'abord → l'index reste frais, les mises à jour ne sont jamais
 *      bloquées ; la réponse est copiée comme coquille de secours ;
 *   2. sinon la COQUILLE SPA en cache (toutes les routes, /admin compris) ;
 *   3. sinon la page `offline.html` (puis la version en ligne de code).
 *
 * ⚠️ Ne rejette JAMAIS : c'est ce chemin qui laissait /admin blanc.
 */
async function navigationHandler(request) {
  try {
    const cache = await caches.open(NAV_CACHE);

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        // Copie de secours rafraîchie à chaque navigation réussie.
        cache.put(SHELL_URL, response.clone());
        return response;
      }

      // Erreur HTTP (4xx/5xx) : on préfère la coquille en cache.
      const shell = await cache.match(SHELL_URL);
      if (shell) return shell;

      return response;
    } catch (error) {
      console.warn('[sw] navigation hors ligne :', error);

      const shell = await cache.match(SHELL_URL);
      if (shell) return shell;

      return offlineResponse();
    }
  } catch (error) {
    console.warn('[sw] navigationHandler en échec :', error);

    // Stockage indisponible : la page de secours reste toujours possible.
    return offlineResponse();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      /*
       * Pré-cache de la page « hors ligne » : sans elle, une navigation hors
       * ligne sans coquille SPA en cache n'aurait rien à afficher.
       * ⚠️ Encadré : un échec d'installation laisserait le SW inopérant.
       * ⚠️ `add(URL)` (et non `new Request(url, { cache: 'reload' })`) : cette
       * dernière option n'est pas supportée par Safari et ferait échouer le
       * pré-cache sur iPhone.
       */
      try {
        const cache = await caches.open(NAV_CACHE);
        await cache.add(OFFLINE_URL);
      } catch (error) {
        console.warn('[sw] pré-cache de offline.html impossible :', error);
      }

      // Active immédiatement la nouvelle version du SW.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge des anciens caches (versions précédentes — dont l'ancien NAV_CACHE).
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(
              (key) =>
                key !== IMAGE_CACHE && key !== RUNTIME_CACHE && key !== NAV_CACHE,
            )
            .map((key) => caches.delete(key)),
        );
      } catch (error) {
        console.warn('[sw] purge des caches impossible :', error);
      }

      try {
        await self.clients.claim();
      } catch (error) {
        console.warn('[sw] prise de contrôle des onglets impossible :', error);
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que les GET.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    // URL illisible : on laisse le navigateur gérer (jamais de rejet).
    return;
  }

  // Jamais de cache pour le cross-origin (tuiles, fonts distantes, CDN…).
  if (url.origin !== self.location.origin) return;

  /*
   * NAVIGATIONS (application monopage : /admin, /driver, /…)
   *
   * ⚠️ Elles sont désormais INTERCEPTÉES : `networkFirst` sur une navigation
   * était le chemin qui laissait la page blanche (promesse rejetée quand le
   * `fetch` échouait). Ici, le réseau passe d'abord (index toujours frais),
   * puis la coquille SPA en cache, puis `offline.html`.
   */
  if (request.mode === 'navigate') {
    event.respondWith(withFallback(() => navigationHandler(request), offlineResponse));
    return;
  }

  // Cache First : images.
  if (request.destination === 'image' || url.pathname.startsWith('/images/')) {
    event.respondWith(
      withFallback(
        () => cacheFirst(request, IMAGE_CACHE),
        () => textResponse('Image indisponible hors ligne.', 404, 'Not Found'),
      ),
    );
    return;
  }

  // Cache First : polices.
  if (request.destination === 'font' || /\.(woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(
      withFallback(
        () => cacheFirst(request, IMAGE_CACHE),
        () => textResponse('Police indisponible hors ligne.', 404, 'Not Found'),
      ),
    );
    return;
  }

  // Network First : JS, CSS et le reste.
  // ⚠️ Le filet garantit une Response valide (jamais de promesse rejetée).
  event.respondWith(
    withFallback(
      () => networkFirst(request, RUNTIME_CACHE),
      () =>
        textResponse(
          'Hors ligne — vérifiez votre connexion internet.',
          503,
          'Service Unavailable',
        ),
    ),
  );
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


