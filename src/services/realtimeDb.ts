/**
 * Realtime Database — positions GPS, présence en ligne et demandes de course.
 *
 * Arborescence :
 *   /positions/drivers/{uid}    → { latitude, longitude, updatedAt }
 *   /positions/passengers/{uid} → { latitude, longitude, updatedAt }
 *   /online/drivers/{uid}       → { online, updatedAt }
 *   /rideRequests/{id}          → demande de course (RideRequest)
 *
 * Toutes les fonctions `subscribe*` retournent une fonction de DÉSABONNEMENT.
 * Si Firebase/RTDB n'est pas configuré, tout est inerte (no-op).
 */
import { onDisconnect, onValue, ref, remove, set, update } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import type {
  GeoPosition,
  LiveOffer,
  NegotiationMessage,
  NegotiationStatus,
  RideRequest,
} from '../types';
import { getRealtimeDb } from './firebase';

/** Position horodatée reçue du temps réel. */
export interface LivePosition extends GeoPosition {
  updatedAt: number;
}

/** Positions live indexées par uid. */
export type PositionMap = Record<string, LivePosition>;

/**
 * Règle RTDB : `online/drivers/{uid}` doit contenir un BOOLÉEN
 * (`.validate: "newData.isBoolean()"`), pas un objet.
 */
export type OnlineMap = Record<string, boolean>;

/** Realtime Database est-il prêt ? */
export function isRealtimeReady(): boolean {
  return getRealtimeDb() !== null;
}

/* ============================== POSITIONS ============================== */

/** Publie la position d'un conducteur (écriture temps réel). */
export async function publishDriverPosition(
  driverId: string,
  position: GeoPosition,
): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !driverId) return false;

  try {
    await set(ref(rtdb, `positions/drivers/${driverId}`), payloadOf(position));
    return true;
  } catch (error) {
    console.warn('[rtdb] publishDriverPosition :', error);
    return false;
  }
}

/** Charge utile d'une position (accuracy incluse seulement si connue). */
function payloadOf(position: GeoPosition): Record<string, number> {
  const payload: Record<string, number> = {
    latitude: position.latitude,
    longitude: position.longitude,
    updatedAt: Date.now(),
  };

  if (typeof position.accuracy === 'number') payload.accuracy = position.accuracy;

  return payload;
}

/** Écoute la position d'un conducteur en temps réel. */
export function subscribeToDriverPosition(
  driverId: string,
  callback: (position: LivePosition | null) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb || !driverId) return () => {};

  return onValue(
    ref(rtdb, `positions/drivers/${driverId}`),
    (snapshot) => callback((snapshot.val() as LivePosition | null) ?? null),
    (error) => console.warn('[rtdb] subscribeToDriverPosition :', error),
  );
}

/** Publie la position d'un client. */
export async function publishPassengerPosition(
  passengerId: string,
  position: GeoPosition,
): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !passengerId) return false;

  try {
    await set(ref(rtdb, `positions/passengers/${passengerId}`), payloadOf(position));
    return true;
  } catch (error) {
    console.warn('[rtdb] publishPassengerPosition :', error);
    return false;
  }
}

/** Écoute TOUTES les positions de conducteurs (carte passager / admin). */
export function subscribeToAllDriverPositions(
  callback: (positions: PositionMap) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb) return () => {};

  return onValue(
    ref(rtdb, 'positions/drivers'),
    (snapshot) => callback((snapshot.val() as PositionMap | null) ?? {}),
    (error) => console.warn('[rtdb] subscribeToAllDriverPositions :', error),
  );
}

/**
 * Écoute toutes les positions (conducteurs + clients) — carte admin.
 *
 * ⚠️ Les règles RTDB n'autorisent la lecture que sur `positions/drivers` et
 * `positions/passengers` (pas sur la racine `/positions`) : on combine donc
 * deux abonnements.
 */
export function subscribeToAllPositions(
  callback: (positions: { drivers: PositionMap; passengers: PositionMap }) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb) return () => {};

  const drivers: PositionMap = {};
  const passengers: PositionMap = {};

  const unsubscribeDrivers = onValue(
    ref(rtdb, 'positions/drivers'),
    (snapshot) => {
      callback({
        drivers: (snapshot.val() as PositionMap | null) ?? {},
        passengers,
      });
    },
    (error) => console.warn('[rtdb] subscribeToAllPositions (drivers) :', error),
  );

  const unsubscribePassengers = onValue(
    ref(rtdb, 'positions/passengers'),
    (snapshot) => {
      callback({
        drivers,
        passengers: (snapshot.val() as PositionMap | null) ?? {},
      });
    },
    (error) => console.warn('[rtdb] subscribeToAllPositions (passengers) :', error),
  );

  return () => {
    unsubscribeDrivers();
    unsubscribePassengers();
  };
}

/** Supprime la position publiée (conducteur hors ligne). */
export async function removeDriverPosition(driverId: string): Promise<void> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !driverId) return;

  try {
    await remove(ref(rtdb, `positions/drivers/${driverId}`));
  } catch (error) {
    console.warn('[rtdb] removeDriverPosition :', error);
  }
}

/* =========================== STATUT EN LIGNE =========================== */

/**
 * Publie le statut en ligne/hors ligne d'un conducteur.
 *
 * ⚠️ La valeur écrite est un BOOLÉEN (contrainte des règles RTDB) et la clé
 * doit être l'uid Firebase (`auth.uid === $driverId`).
 * En passant en ligne, un `onDisconnect` remet automatiquement le statut à
 * `false` si l'application est fermée ou perd le réseau.
 */
export async function publishOnlineStatus(
  driverId: string,
  isOnline: boolean,
): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !driverId) return false;

  const statusRef = ref(rtdb, `online/drivers/${driverId}`);

  try {
    await set(statusRef, isOnline);

    if (isOnline) {
      await onDisconnect(statusRef).set(false);
    } else {
      await onDisconnect(statusRef).cancel();
      await remove(ref(rtdb, `positions/drivers/${driverId}`));
    }

    return true;
  } catch (error) {
    console.warn('[rtdb] publishOnlineStatus :', error);
    return false;
  }
}

/** Écoute les conducteurs en ligne (admin / compteur passager). */
export function subscribeToOnlineDrivers(
  callback: (drivers: OnlineMap) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb) return () => {};

  return onValue(
    ref(rtdb, 'online/drivers'),
    (snapshot) => callback((snapshot.val() as OnlineMap | null) ?? {}),
    (error) => console.warn('[rtdb] subscribeToOnlineDrivers :', error),
  );
}

/* ========================= DEMANDES DE COURSE ========================= */

/** Publie une demande de course (visible par les conducteurs en temps réel). */
export async function publishRideRequest(request: RideRequest): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !request.id) return false;

  try {
    await set(ref(rtdb, `rideRequests/${request.id}`), {
      ...request,
      createdAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.warn('[rtdb] publishRideRequest :', error);
    return false;
  }
}

/** Écoute les demandes de course en attente. */
export function subscribeToRideRequests(
  callback: (requests: RideRequest[]) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb) return () => {};

  return onValue(
    ref(rtdb, 'rideRequests'),
    (snapshot) => {
      const value = (snapshot.val() as Record<string, RideRequest> | null) ?? {};
      callback(Object.values(value));
    },
    (error) => console.warn('[rtdb] subscribeToRideRequests :', error),
  );
}

/** Retire une demande de course (annulation client ou course acceptée). */
export async function removeRideRequest(requestId: string): Promise<void> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !requestId) return;

  try {
    await remove(ref(rtdb, `rideRequests/${requestId}`));
  } catch (error) {
    console.warn('[rtdb] removeRideRequest :', error);
  }
}

/* ========================= STATUT DE COURSE (live) ========================= */
/**
 * Publie le statut d'une course sur la Realtime Database (`/rideStatus/{id}`).
 *
 * ⚠️ Firestore reste la SOURCE DE VÉRITÉ (le client l'écoute via `onSnapshot`) ;
 * ce canal est complémentaire (état léger, lecture instantanée).
 * Ajoutez `rideStatus` aux règles RTDB pour autoriser l'écriture.
 */
export async function publishRideStatus(
  rideId: string,
  status: string,
): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !rideId) return false;

  try {
    await set(ref(rtdb, `rideStatus/${rideId}`), status);
    return true;
  } catch (error) {
    console.warn('[rtdb] publishRideStatus :', error);
    return false;
  }
}

/** Écoute le statut live d'une course (complément de Firestore). */
export function subscribeToRideStatus(
  rideId: string,
  callback: (status: string | null) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb || !rideId) return () => {};

  return onValue(
    ref(rtdb, `rideStatus/${rideId}`),
    (snapshot) => callback((snapshot.val() as string | null) ?? null),
    (error) => console.warn('[rtdb] subscribeToRideStatus :', error),
  );
}

/* ================== OFFRES & NÉGOCIATION (client ↔ chauffeur) ================== */

/** Offre de prix publiée par un conducteur pour une demande (temps réel). */
export type { LiveOffer } from '../types';

/** Publie (ou met à jour) une offre de prix : `/offers/{offerId}`. */
export async function publishOffer(offer: LiveOffer): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !offer.id) return false;

  try {
    await set(ref(rtdb, `offers/${offer.id}`), { ...offer, updatedAt: Date.now() });
    return true;
  } catch (error) {
    console.warn('[rtdb] publishOffer :', error);
    return false;
  }
}

/** Écoute TOUTES les offres en cours (client : les siennes ; conducteur : les siennes). */
export function subscribeToOffers(
  callback: (offers: LiveOffer[]) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb) return () => {};

  return onValue(
    ref(rtdb, 'offers'),
    (snapshot) => {
      const value = (snapshot.val() as Record<string, LiveOffer> | null) ?? {};
      callback(
        Object.entries(value).map(([id, offer]) => ({
          ...offer,
          id: offer.id || id,
        })),
      );
    },
    (error) => console.warn('[rtdb] subscribeToOffers :', error),
  );
}

/** Retire une offre (accord trouvé, refus ou expiration). */
export async function removeOffer(offerId: string): Promise<void> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !offerId) return;

  try {
    await remove(ref(rtdb, `offers/${offerId}`));
    await remove(ref(rtdb, `negotiations/${offerId}`));
  } catch (error) {
    console.warn('[rtdb] removeOffer :', error);
  }
}

/**
 * Publie un tour de négociation : `/negotiations/{offerId}/rounds/{round}`.
 * `round` = numéro du tour dans la séquence (1, 2, 3…) → clé déterministe.
 * On met aussi à jour l'offre (`rounds`, `currentRound`, `price`) pour que
 * clients et conducteurs reçoivent tout depuis `/offers`.
 */
export async function publishNegotiation(
  offerId: string,
  message: NegotiationMessage,
  round: number,
): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !offerId) return false;

  try {
    await set(ref(rtdb, `negotiations/${offerId}/rounds/${round}`), message);
    await set(ref(rtdb, `negotiations/${offerId}/currentRound`), round);
    return true;
  } catch (error) {
    console.warn('[rtdb] publishNegotiation :', error);
    return false;
  }
}

/** Dernier tour publié pour une offre. */
export interface LiveNegotiation {
  rounds: NegotiationMessage[];
  currentRound: number;
}

/** Écoute la négociation d'une offre en temps réel. */
export function subscribeToNegotiation(
  offerId: string,
  callback: (negotiation: LiveNegotiation) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb || !offerId) return () => {};

  return onValue(
    ref(rtdb, `negotiations/${offerId}`),
    (snapshot) => {
      const value =
        (snapshot.val() as { rounds?: Record<string, NegotiationMessage>; currentRound?: number } | null) ??
        {};

      const rounds = Object.entries(value.rounds ?? {})
        .map(([round, message]) => ({ round: Number(round), message }))
        .sort((a, b) => a.round - b.round)
        .map((item) => item.message);

      callback({ rounds, currentRound: value.currentRound ?? rounds.length });
    },
    (error) => console.warn('[rtdb] subscribeToNegotiation :', error),
  );
}

/** Publie le statut d'une offre : `/offers/{offerId}/status`. */
export async function publishOfferStatus(
  offerId: string,
  status: NegotiationStatus,
  patch: Partial<LiveOffer> = {},
): Promise<boolean> {
  const rtdb = getRealtimeDb();
  if (!rtdb || !offerId) return false;

  try {
    /*
     * `update` (et non `set`) : les champs existants de l'offre (driverId,
     * requestId, price…) sont conservés — les règles de sécurité les exigent.
     */
    await update(ref(rtdb, `offers/${offerId}`), {
      ...patch,
      status,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.warn('[rtdb] publishOfferStatus :', error);
    return false;
  }
}

