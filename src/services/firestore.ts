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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, Query, QueryDocumentSnapshot } from 'firebase/firestore';
import type { DriverGift, RechargeRequest, Ride, User, UserRole, WalletWriteResult } from '../types';
import type { NegotiationMessage, NegotiationStatus } from '../types';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';

/** Résultat d'une écriture Firestore. */
export type WriteResult = WalletWriteResult;

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

  return watchCollection<User>(
    'users',
    () => collection(db, 'users'),
    (docs) => mapDocs<User>(docs),
    (users) => {
      console.debug(`[sync] comptes reçus : ${users.length}`);
      onUsers(users);
    },
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

/** Supprime TOUTES les courses d'un conducteur (purge de l'historique). */
export async function deleteRidesByDriver(driverId: string): Promise<number> {
  const db = getFirestoreDb();
  if (!db || !driverId) return 0;

  try {
    const snapshot = await getDocs(
      query(collection(db, 'rides'), where('driverId', '==', driverId)),
    );

    await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));

    console.info(
      `[historique] ${snapshot.size} course(s) supprimée(s) pour ${driverId}.`,
    );
    return snapshot.size;
  } catch (error) {
    console.warn('[firestore] deleteRidesByDriver :', error);
    return 0;
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

  return watchCollection<Ride>(
    'rides',
    () => (filter ? query(base, where(filter.field, '==', filter.value)) : query(base)),
    (docs) => mapDocs<Ride>(docs),
    (rides) => {
      console.debug(`[sync] courses reçues : ${rides.length}`);
      onRides(rides);
    },
  );
}

/* ======================== RECHARGES MOBILE MONEY ======================== */

/** Crée une demande de recharge (docId = `request.id`). */
export async function createRechargeRequest(
  data: RechargeRequest,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: data.id, error: 'Firebase non configuré.' };

  const id = data.id || `RC-${Date.now()}`;

  console.debug('[recharge] envoi…', {
    id,
    driverId: data.driverId,
    amount: data.amount,
    method: data.method,
    captureKo: Math.round(data.screenshot.length / 1024),
  });

  try {
    await withWriteRetry(
      () => setDoc(doc(db, 'rechargeRequests', id), { ...data, id }),
      'demande de recharge',
    );

    console.info(`[recharge] ✅ demande ${id} écrite dans Firestore (status=${data.status}).`);
    return { ok: true, id };
  } catch (error) {
    const message = toWriteError(error);
    console.error(`[recharge] ❌ écriture impossible (${id}) : ${message}`);
    return { ok: false, id, error: message };
  }
}

/** Met à jour une demande de recharge (validation admin). */
export async function updateRechargeRequest(
  id: string,
  data: Partial<RechargeRequest>,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id, error: 'Firebase non configuré.' };

  console.debug(`[recharge] mise à jour ${id}…`, data);

  try {
    await withWriteRetry(
      () => updateDoc(doc(db, 'rechargeRequests', id), data),
      'validation de recharge',
    );

    console.info(`[recharge] ✅ demande ${id} mise à jour (${String(data.status)}).`);
    return { ok: true, id };
  } catch (error) {
    const message = toWriteError(error);
    console.error(`[recharge] ❌ mise à jour impossible (${id}) : ${message}`);
    return { ok: false, id, error: message };
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
  onStatus?: (status: 'live' | 'error') => void,
): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  return watchCollection<RechargeRequest>(
    'rechargeRequests',
    () => collection(db, 'rechargeRequests'),
    (docs) => mapDocs<RechargeRequest>(docs),
    (requests) => {
      console.info(`[recharge] snapshot reçu : ${requests.length} demande(s).`);
      onRequests(requests);
    },
    onStatus,
  );
}

/* ================================ GIFTS ================================ */

/** Crée un cadeau de recharge (docId = `gift.id`). */
export async function createGift(data: DriverGift): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db) return { ok: false, id: data.id, error: 'Firebase non configuré.' };

  const id = data.id || `GF-${Date.now()}`;

  console.debug('[cadeau] envoi…', {
    id,
    driverId: data.driverId,
    amount: data.amount,
  });

  try {
    await withWriteRetry(
      () => setDoc(doc(db, 'gifts', id), { ...data, id }),
      'cadeau',
    );

    console.info(`[cadeau] ✅ ${id} écrit dans Firestore (${data.amount} F).`);
    return { ok: true, id };
  } catch (error) {
    const message = toWriteError(error);
    console.error(`[cadeau] ❌ écriture impossible (${id}) : ${message}`);
    return { ok: false, id, error: message };
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
  onStatus?: (status: 'live' | 'error') => void,
): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  return watchCollection<DriverGift>(
    'gifts',
    () => collection(db, 'gifts'),
    (docs) => mapDocs<DriverGift>(docs),
    (gifts) => {
      console.info(`[cadeau] snapshot reçu : ${gifts.length} cadeau(x).`);
      onGifts(gifts);
    },
    onStatus,
  );
}

/**
 * Réessaie une ÉCRITURE Firestore.
 *
 * Même cause que pour les abonnements : une écriture lancée juste après
 * l'ouverture de la session anonyme peut être refusée (`permission-denied`) le
 * temps que le jeton soit propagé. Sans réessai, la demande de recharge était
 * **perdue en silence** (aucune trace, aucun message).
 */
async function withWriteRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  const delays = [500, 1500, 3000];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= delays.length) {
        console.warn(`[firestore] écriture « ${label} » abandonnée.`, error);
        throw error;
      }

      console.warn(
        `[firestore] écriture « ${label} » refusée (tentative ${attempt + 1}) → nouvel essai…`,
        error,
      );

      await new Promise((resolve) => {
        setTimeout(resolve, delays[attempt] ?? 3000);
      });
    }
  }
}

/**
 * Abonnement Firestore ROBUSTE.
 *
 * ⚠️ Un `onSnapshot` en erreur ne se réessaie **jamais** tout seul. Or la toute
 * première requête envoyée après l'ouverture de la session anonyme est souvent
 * refusée (`permission-denied`) le temps que le jeton soit propagé côté SDK.
 * Avec un nombre d'essais limité, l'abonnement restait mort DÉFINITIVEMENT :
 * l'admin ne recevait alors plus JAMAIS les données distantes (bug « les
 * demandes de recharge n'arrivent pas chez l'admin »). On réessaie donc sans
 * limite, avec un back-off progressif plafonné à 10 s.
 */
function watchCollection<T>(
  label: string,
  build: () => Query,
  map: (docs: QueryDocumentSnapshot<DocumentData>[]) => T[],
  onData: (items: T[]) => void,
  onStatus?: (status: 'live' | 'error') => void,
): () => void {
  const db = getFirestoreDb();
  if (!db) return () => {};

  let unsubscribe: (() => void) | null = null;
  let retryTimer: number | null = null;
  let attempts = 0;
  let cancelled = false;

  const RETRY_DELAYS = [1000, 3000, 5000, 10000];

  const start = () => {
    if (cancelled) return;

    unsubscribe = onSnapshot(
      build(),
      (snapshot) => {
        if (attempts > 0) {
          console.info(`[sync] « ${label} » rétabli après ${attempts} tentative(s).`);
        }
        attempts = 0;
        onStatus?.('live');
        const items = map(snapshot.docs);
        console.debug(`[sync] ${label} : ${items.length} document(s)`);
        onData(items);
      },
      (error) => {
        console.warn(`[firestore] abonnement « ${label} » en erreur :`, error);
        onStatus?.('error');
        if (cancelled) return;

        const delay = RETRY_DELAYS[Math.min(attempts, RETRY_DELAYS.length - 1)];
        attempts += 1;
        console.info(
          `[firestore] nouvelle tentative « ${label} » (#${attempts}) dans ${delay / 1000} s…`,
        );
        retryTimer = window.setTimeout(start, delay);
      },
    );
  };

  start();

  return () => {
    cancelled = true;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    unsubscribe?.();
  };
}

/** Incrémente le solde d'un conducteur (`users/{uid}.driverBalance`). */
export async function incrementDriverBalance(
  uid: string,
  amount: number,
): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db || !uid) return { ok: false, id: uid, error: 'Firebase non configuré.' };

  try {
    await withWriteRetry(
      () => updateDoc(doc(db, 'users', uid), { driverBalance: increment(amount) }),
      'solde conducteur',
    );

    console.info(`[solde] ${uid} crédité de ${amount} F.`);
    return { ok: true, id: uid };
  } catch (error) {
    const message = toWriteError(error);
    console.error(`[solde] ❌ crédit impossible (${uid}) : ${message}`);
    return { ok: false, id: uid, error: message };
  }
}

/** Document d'historique d'une négociation de prix. */
export interface NegotiationLog {
  offerId: string;
  requestId?: string;
  driverAccountId?: string;
  passengerAccountId?: string;
  price: number;
  status: NegotiationStatus;
  rounds: NegotiationMessage[];
}

/**
 * Enregistre l'état d'une négociation dans `negotiations/{offerId}`
 * (historique consultable depuis la console Firebase).
 */
export async function saveNegotiation(log: NegotiationLog): Promise<WriteResult> {
  const db = getFirestoreDb();
  if (!db || !log.offerId) {
    return { ok: false, id: log.offerId, error: 'Firebase non configuré.' };
  }

  try {
    await setDoc(doc(db, 'negotiations', log.offerId), {
      ...log,
      updatedAt: Date.now(),
    });
    return { ok: true, id: log.offerId };
  } catch (error) {
    return { ok: false, id: log.offerId, error: toWriteError(error) };
  }
}

/** Firestore est-il utilisable ? */
export function isCloudDbReady(): boolean {
  return isFirebaseConfigured && getFirestoreDb() !== null;
}