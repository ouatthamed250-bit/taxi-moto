/**
 * Firestore — comptes, courses, recharges, cadeaux.
 *
 * Toutes les fonctions sont ASYNCHRONES et retournent une Promise.
 * Si Firebase n'est pas configuré, elles renvoient des valeurs vides / `ok: false`
 * (l'application bascule alors sur le stockage local — voir `authService.ts`).
 *
 * Collections :
 *   users/{uid}           → compte (role: 'passenger' | 'driver')
 *   rides/{rideId}        → course (champ `id` conservé dans le document)
 *   rechargeRequests/{id} → demande de recharge mobile money
 *   gifts/{id}            → cadeau de recharge offert par l'admin
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { DriverGift, RechargeRequest, Ride, User, UserRole } from '../types';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';

/** Résultat d'une écriture Firestore. */
export interface WriteResult {
  ok: boolean;
  id: string;
  error?: string;
}

function toWriteError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Erreur Firestore inconnue.';
}

/** Mappe les documents d'une collection en objets typés (id = docId). */
function mapDocs<T>(docs: QueryDocumentSnapshot<DocumentData>[]): T[] {
  return docs.map((item) => ({ ...(item.data() as object), id: item.id }) as T);
}

/**
 * Réessaie une lecture Firestore.
 *
 * La toute première requête envoyée juste après l'ouverture de session (auth
 * anonyme) peut être refusée le temps que le jeton soit propagé côté SDK.
 * Un second essai (400 ms plus tard) évite un faux « compte introuvable ».
 */
async function withAuthRetry<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (firstError) {
    console.warn('[firestore] 1re tentative refusée, nouvel essai après auth…', firstError);

    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });

    try {
      return await operation();
    } catch (retryError) {
      console.warn('[firestore] échec définitif :', retryError);
      return fallback;
    }
  }
}

/* ================================ USERS ================================ */

/** Récupère un compte par son uid (docId). */
export async function getUser(uid: string): Promise<User | null> {
  const db = getFirestoreDb();
  if (!db || !uid) return null;

  return withAuthRetry(async () => {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return null;
    return { ...(snapshot.data() as object), id: snapshot.id } as User;
  }, null);
}

/** Crée (ou remplace) le compte `users/{uid}`. */
export async function createUser(uid: string, data: User): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: uid, error: 'Firebase non configuré.' };

  try {
    await setDoc(doc(db, 'users', uid), { ...data, id: uid });
    return { ok: true, id: uid };
  } catch (error) {
    return { ok: false, id: uid, error: toWriteError(error) };
  }
}

/** Met à jour partiellement le compte `users/{uid}`. */
export async function updateUser(
  uid: string,
  data: Partial<User>,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: uid, error: 'Firebase non configuré.' };

  try {
    await updateDoc(doc(db, 'users', uid), data);
    return { ok: true, id: uid };
  } catch (error) {
    return { ok: false, id: uid, error: toWriteError(error) };
  }
}

/** Recherche un compte par numéro de téléphone (normalisé : chiffres seuls). */
export async function findUserByPhone(phone: string): Promise<User | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const normalized = phone.replace(/\D/g, '');
  if (!normalized) return null;

  return withAuthRetry(async () => {
    const snapshot = await getDocs(
      query(collection(db, 'users'), where('phone', '==', normalized)),
    );
    if (snapshot.empty) return null;
    const first = snapshot.docs[0];
    return { ...(first.data() as object), id: first.id } as User;
  }, null);
}

/** Liste les comptes d'un rôle ('passenger' | 'driver'). */
export async function listUsersByRole(role: UserRole): Promise<User[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await getDocs(
      query(collection(db, 'users'), where('role', '==', role)),
    );
    return mapDocs<User>(snapshot.docs);
  } catch (error) {
    console.warn('[firestore] listUsersByRole :', error);
    return [];
  }
}

/** Écoute la collection `users` en temps réel (comptes persistants). */
export function subscribeToUsers(onUsers: (users: User[]) => void): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => onUsers(mapDocs<User>(snapshot.docs)),
    (error) => console.warn('[firestore] subscribeToUsers :', error),
  );
}

/* ================================ RIDES ================================ */

/** Crée une course (docId = `ride.id` s'il existe, sinon généré). */
export async function createRide(data: Ride): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: data.id, error: 'Firebase non configuré.' };

  try {
    if (data.id) {
      await setDoc(doc(db, 'rides', data.id), data);
      return { ok: true, id: data.id };
    }
    const created = await addDoc(collection(db, 'rides'), data);
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, id: data.id, error: toWriteError(error) };
  }
}

/** Met à jour partiellement une course. */
export async function updateRide(
  id: string,
  data: Partial<Ride>,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id, error: 'Firebase non configuré.' };

  try {
    await updateDoc(doc(db, 'rides', id), data);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, id, error: toWriteError(error) };
  }
}

/** Liste les courses d'un conducteur. */
export async function listRidesByDriver(driverId: string): Promise<Ride[]> {
  const db = getFirestoreDb();
  if (!db || !driverId) return [];

  try {
    const snapshot = await getDocs(
      query(collection(db, 'rides'), where('driverId', '==', driverId)),
    );
    return mapDocs<Ride>(snapshot.docs);
  } catch (error) {
    console.warn('[firestore] listRidesByDriver :', error);
    return [];
  }
}

/** Liste les courses d'un client. */
export async function listRidesByPassenger(
  passengerId: string,
): Promise<Ride[]> {
  const db = getFirestoreDb();
  if (!db || !passengerId) return [];

  try {
    const snapshot = await getDocs(
      query(collection(db, 'rides'), where('passengerId', '==', passengerId)),
    );
    return mapDocs<Ride>(snapshot.docs);
  } catch (error) {
    console.warn('[firestore] listRidesByPassenger :', error);
    return [];
  }
}

/** Écoute les courses en temps réel (filtre optionnel). */
export function subscribeToRides(
  onRides: (rides: Ride[]) => void,
  filter?: { field: 'driverId' | 'passengerId'; value: string },
): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  const base = collection(db, 'rides');
  const target = filter
    ? query(base, where(filter.field, '==', filter.value))
    : query(base);

  return onSnapshot(
    target,
    (snapshot) => onRides(mapDocs<Ride>(snapshot.docs)),
    (error) => console.warn('[firestore] subscribeToRides :', error),
  );
}

/* ======================== RECHARGES MOBILE MONEY ======================== */

/** Crée une demande de recharge (docId = `request.id`). */
export async function createRechargeRequest(
  data: RechargeRequest,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: data.id, error: 'Firebase non configuré.' };

  try {
    if (data.id) {
      await setDoc(doc(db, 'rechargeRequests', data.id), data);
      return { ok: true, id: data.id };
    }
    const created = await addDoc(collection(db, 'rechargeRequests'), data);
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, id: data.id, error: toWriteError(error) };
  }
}

/** Met à jour une demande de recharge (validation admin). */
export async function updateRechargeRequest(
  id: string,
  data: Partial<RechargeRequest>,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id, error: 'Firebase non configuré.' };

  try {
    await updateDoc(doc(db, 'rechargeRequests', id), data);
    return { ok: true, id };
  } catch (error) {
    return { ok: false, id, error: toWriteError(error) };
  }
}

/** Liste toutes les demandes de recharge. */
export async function listRechargeRequests(): Promise<RechargeRequest[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await getDocs(collection(db, 'rechargeRequests'));
    return mapDocs<RechargeRequest>(snapshot.docs);
  } catch (error) {
    console.warn('[firestore] listRechargeRequests :', error);
    return [];
  }
}

/** Écoute les demandes de recharge en temps réel. */
export function subscribeToRechargeRequests(
  onRequests: (requests: RechargeRequest[]) => void,
): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  return onSnapshot(
    collection(db, 'rechargeRequests'),
    (snapshot) => onRequests(mapDocs<RechargeRequest>(snapshot.docs)),
    (error) => console.warn('[firestore] subscribeToRechargeRequests :', error),
  );
}

/* ================================ GIFTS ================================ */

/** Crée un cadeau de recharge (docId = `gift.id`). */
export async function createGift(data: DriverGift): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: data.id, error: 'Firebase non configuré.' };

  try {
    if (data.id) {
      await setDoc(doc(db, 'gifts', data.id), data);
      return { ok: true, id: data.id };
    }
    const created = await addDoc(collection(db, 'gifts'), data);
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, id: data.id, error: toWriteError(error) };
  }
}

/** Liste tous les cadeaux. */
export async function listGifts(): Promise<DriverGift[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await getDocs(collection(db, 'gifts'));
    return mapDocs<DriverGift>(snapshot.docs);
  } catch (error) {
    console.warn('[firestore] listGifts :', error);
    return [];
  }
}

/** Écoute les cadeaux en temps réel. */
export function subscribeToGifts(
  onGifts: (gifts: DriverGift[]) => void,
): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  return onSnapshot(
    collection(db, 'gifts'),
    (snapshot) => onGifts(mapDocs<DriverGift>(snapshot.docs)),
    (error) => console.warn('[firestore] subscribeToGifts :', error),
  );
}

/** Firestore est-il utilisable ? */
export function isCloudDbReady(): boolean {
  return isFirebaseConfigured && getFirestoreDb() !== null;
}
