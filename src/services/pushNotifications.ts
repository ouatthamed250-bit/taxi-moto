/**
 * Notifications PUSH (Firebase Cloud Messaging) — CONDUCTEUR uniquement.
 *
 * ⚠️ AUCUNE clé serveur ici : le navigateur ne fait que DEMANDER un token
 * auprès de FCM (clé VAPID publique) et l'enregistrer dans
 * `users/{uid}.fcmToken`. L'envoi réel des notifications nécessite une
 * **Cloud Function** (voir `functions/` ou la console Firebase) : impossible
 * d'envoyer un push depuis le client sans exposer une clé de serveur.
 *
 * Ce qui fonctionne SANS Cloud Function :
 *   • demande de permission + obtention du token FCM ;
 *   • notification LOCALE (`showNotification`) quand l'app est ouverte ou en
 *     arrière-plan (le Service Worker affiche la notification système) ;
 *   • réception des pushs au PREMIER PLAN (`onMessageReceived`) et en
 *     ARRIÈRE-PLAN (Service Worker + `onBackgroundMessage`) dès que les
 *     Cloud Functions seront déployées.
 */
import {
  deleteToken as deleteFcmToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging';
import type { MessagePayload, Messaging, Unsubscribe } from 'firebase/messaging';
import type { PushPermission, PushSupport } from '../types';
import { app, isFirebaseConfigured } from './firebase';
import { updateUser } from './firestore';

/** Clé VAPID (publique) — `.env` / Vercel → `VITE_FIREBASE_VAPID_KEY`. */
const VAPID_KEY = String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '').trim();

/** Service Worker unique de l'application (PWA + FCM). */
const SW_URL = '/sw.js';

/** Mémorise que le conducteur ne veut plus voir le bandeau d'activation. */
const PROMPT_DISMISSED_KEY = 'taxi.push.prompt.dismissed';

/** État de la messagerie sur cet appareil (mémoïsé). */
let messagingPromise: Promise<Messaging | null> | null = null;

/** Le navigateur peut-il afficher des notifications système ? */
function browserSupportsPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Support réel : navigateur + Firebase + clé VAPID. */
export function pushSupport(): PushSupport {
  if (!browserSupportsPush()) return 'unsupported';
  if (!isFirebaseConfigured || !VAPID_KEY) return 'unconfigured';
  return 'supported';
}

/** Permission actuelle (sans la demander). */
export function notificationPermission(): PushPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as PushPermission;
}

/**
 * Demande la permission de notification au navigateur.
 * ⚠️ À appeler depuis un geste utilisateur (clic), sinon Safari/Chrome refusent.
 */
export async function requestPermission(): Promise<PushPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const result = await Notification.requestPermission();
    return result as PushPermission;
  } catch (error) {
    console.warn('[push] demande de permission impossible :', error);
    return 'default';
  }
}

/** Le bandeau d'activation a-t-il déjà été ignoré par l'utilisateur ? */
export function readPushPromptDismissed(): boolean {
  try {
    return window.localStorage.getItem(PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Mémorise le refus d'afficher le bandeau (on ne harcèle pas l'utilisateur). */
export function writePushPromptDismissed(): void {
  try {
    window.localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
  } catch {
    // stockage indisponible (navigation privée) : on ignore
  }
}

/**
 * Enregistrement du Service Worker (indispensable pour recevoir un push).
 *
 * ⚠️ En production il est déjà enregistré par `main.tsx` ; en développement il
 * ne l'est qu'ici, c'est-à-dire après une action EXPLICITE du conducteur.
 */
async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!browserSupportsPush()) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    const registration = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn('[push] Service Worker indisponible :', error);
    return null;
  }
}

/** Instance FCM (mémoïsée) — `null` si non supporté / non configuré. */
function getMessagingInstance(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!app) return null;

      try {
        if (!(await isSupported())) {
          console.info('[push] FCM non supporté par ce navigateur.');
          return null;
        }
        return getMessaging(app);
      } catch (error) {
        console.warn('[push] initialisation FCM impossible :', error);
        return null;
      }
    })();
  }

  return messagingPromise;
}

/**
 * Récupère le token FCM de CET appareil (nécessite la clé VAPID et la
 * permission accordée). Renvoie `null` si l'un des prérequis manque.
 */
export async function getFCMToken(): Promise<string | null> {
  if (pushSupport() !== 'supported') {
    console.warn(
      '[push] token impossible :',
      isFirebaseConfigured
        ? 'VITE_FIREBASE_VAPID_KEY manquante (.env / Vercel).'
        : 'Firebase non configuré.',
    );
    return null;
  }

  if (notificationPermission() !== 'granted') return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await serviceWorkerRegistration();
  if (!registration) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (error) {
    console.warn('[push] récupération du token impossible :', error);
    return null;
  }
}

/**
 * Écoute les messages reçus quand l'app est OUVERTE (premier plan).
 * Retourne la fonction de désabonnement.
 */
export function onMessageReceived(
  callback: (payload: MessagePayload) => void,
): Unsubscribe {
  let unsubscribe: Unsubscribe | null = null;
  let cancelled = false;

  void (async () => {
    const messaging = await getMessagingInstance();
    if (!messaging || cancelled) return;
    unsubscribe = onMessage(messaging, callback);
  })();

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/** Supprime le token FCM de cet appareil (déconnexion). */
export async function deleteToken(): Promise<boolean> {
  const messaging = await getMessagingInstance();
  if (!messaging) return false;

  try {
    await deleteFcmToken(messaging);
    return true;
  } catch (error) {
    console.warn('[push] suppression du token impossible :', error);
    return false;
  }
}

/**
 * Affiche une notification SYSTÈME via le Service Worker (fallback quand
 * l'app est ouverte / en arrière-plan, en attendant les Cloud Functions).
 * Sans effet si la permission n'est pas accordée.
 */
export async function showNotification(
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  if (notificationPermission() !== 'granted') return;

  const options: NotificationOptions = {
    body,
    icon: '/images/icon.png',
    badge: '/images/favicon.png',
    // Regroupe les notifications d'une même demande (pas d'empilement).
    tag: data.requestId ? `taxi-ride-${data.requestId}` : 'taxi-ride',
    // Le conducteur doit pouvoir lire/agir même écran éteint (Android).
    requireInteraction: true,
    data,
  };

  try {
    const registration = await serviceWorkerRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }

    // Repli sans Service Worker (onglet ouvert).
    new Notification(title, options);
  } catch (error) {
    console.warn('[push] affichage de la notification impossible :', error);
  }
}

/** Enregistre le token du device dans `users/{uid}.fcmToken`. */
export async function saveFcmTokenForUser(
  uid: string,
  token: string,
): Promise<boolean> {
  if (!uid || !token) return false;
  const result = await updateUser(uid, { fcmToken: token });
  return result.ok;
}

/**
 * Efface le token du compte (`fcmToken: ''`) — le serveur ne doit plus cibler
 * cet appareil.
 */
export async function clearFcmTokenForUser(uid: string): Promise<boolean> {
  if (!uid) return false;
  const result = await updateUser(uid, { fcmToken: '' });
  return result.ok;
}

/** Réenregistre le token si la permission est DÉJÀ accordée (passage en ligne). */
export async function registerPushTokenForUser(uid: string): Promise<string | null> {
  if (pushSupport() !== 'supported') return null;
  if (notificationPermission() !== 'granted') return null;

  const token = await getFCMToken();
  if (token && uid) await saveFcmTokenForUser(uid, token);

  return token;
}

/** Supprime le token du device ET l'efface du compte (hors ligne / déconnexion). */
export async function disablePushForUser(uid: string): Promise<void> {
  await deleteToken();
  if (uid) await clearFcmTokenForUser(uid);
}

/**
 * Permission + token + enregistrement Firestore : action du bouton
 * « Activer les notifications » du Dashboard conducteur.
 */
export async function enablePushForUser(
  uid: string,
): Promise<{ granted: boolean; token: string | null }> {
  const permission = await requestPermission();
  if (permission !== 'granted') return { granted: false, token: null };

  const token = await getFCMToken();
  if (token && uid) await saveFcmTokenForUser(uid, token);

  return { granted: true, token };
}

/**
 * Prépare FCM au démarrage de l'app : si la permission est DÉJÀ accordée, on
 * (re)crée l'enregistrement du Service Worker pour que les notifications en
 * arrière-plan continuent d'arriver sans nouvelle action du conducteur.
 */
export function bootstrapMessaging(): void {
  if (pushSupport() !== 'supported') return;
  if (notificationPermission() !== 'granted') return;
  void serviceWorkerRegistration();
}
