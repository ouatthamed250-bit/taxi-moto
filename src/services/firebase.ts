/**
 * Initialisation Firebase — Taxi-Moto.
 *
 * Modules utilisés :
 *   - **Auth**            : session par appareil (connexion ANONYME en interne) ;
 *   - **Firestore**       : comptes, courses, recharges, cadeaux ;
 *   - **Realtime Database**: positions GPS + statuts en ligne (temps réel).
 *
 * ⚠️ Les clés viennent de `.env` (`VITE_FIREBASE_*`) — jamais hardcodées.
 * Si les variables sont absentes, `isFirebaseConfigured` vaut `false` et
 * l'application retombe automatiquement sur le stockage local (localStorage).
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import type { Auth, Unsubscribe, User as FirebaseUser } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import type { Database } from 'firebase/database';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL as string | undefined,
};

/** Toutes les variables obligatoires sont-elles présentes ? */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = firebaseConfig.databaseURL ? getDatabase(app) : null;
  } catch (error) {
    console.warn('[firebase] initialisation impossible :', error);
    app = null;
    auth = null;
    db = null;
    rtdb = null;
  }
} else {
  console.info(
    '[firebase] non configuré (VITE_FIREBASE_*) → mode local localStorage.',
  );
}

export { app, auth, db, rtdb };
export { firebaseConfig };

/** Instance Auth (ou null si Firebase n'est pas configuré). */
export function getFirebaseAuth(): Auth | null {
  return auth;
}

/** Instance Firestore (ou null). */
export function getFirestoreDb(): Firestore | null {
  return db;
}

/** Instance Realtime Database (ou null si pas d'URL/databaseURL). */
export function getRealtimeDb(): Database | null {
  return rtdb;
}

/** uid Firebase de l'appareil (null si aucune session / pas de config). */
export function currentFirebaseUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

/**
 * Garantit une session Firebase (connexion ANONYME : 1 appareil = 1 uid).
 * Renvoie `null` si Firebase n'est pas configuré ou indisponible (hors-ligne).
 */
export async function ensureAnonymousUser(): Promise<FirebaseUser | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    console.warn('[firebase] connexion anonyme impossible :', error);
    return null;
  }
}

/** Écoute les changements de session Firebase (retourne le désabonnement). */
export function onAuthChange(
  callback: (user: FirebaseUser | null) => void,
): Unsubscribe {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

/** Ferme la session Firebase (déconnexion). */
export async function signOutFirebase(): Promise<void> {
  if (!auth) return;
  try {
    await auth.signOut();
  } catch (error) {
    console.warn('[firebase] déconnexion impossible :', error);
  }
}
