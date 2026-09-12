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
import { onDisconnect, onValue, ref, remove, set } from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import type { GeoPosition, RideRequest } from '../types';
import { getRealtimeDb } from './firebase';

/** Position horodatée reçue du temps réel. */
export interface LivePosition extends GeoPosition {
  updatedAt: number;
}

/** Statut en ligne d'un conducteur. */
export interface LiveOnlineStatus {
  online: boolean;
  updatedAt: number;
}

/** Positions live indexées par uid. */
export type PositionMap = Record<string, LivePosition>;

/** Statuts en ligne indexés par uid. */
export type OnlineMap = Record<string, LiveOnlineStatus>;

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
    await set(ref(rtdb, `positions/drivers/${driverId}`), {
      latitude: position.latitude,
      longitude: position.longitude,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.warn('[rtdb] publishDriverPosition :', error);
    return false;
  }
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
    await set(ref(rtdb, `positions/passengers/${passengerId}`), {
      latitude: position.latitude,
      longitude: position.longitude,
      updatedAt: Date.now(),
    });
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

/** Écoute toutes les positions (conducteurs + clients) — carte admin. */
export function subscribeToAllPositions(
  callback: (positions: { drivers: PositionMap; passengers: PositionMap }) => void,
): Unsubscribe {
  const rtdb = getRealtimeDb();
  if (!rtdb) return () => {};

  return onValue(
    ref(rtdb, 'positions'),
    (snapshot) => {
      const value =
        (snapshot.val() as { drivers?: PositionMap; passengers?: PositionMap } | null) ??
        {};

      callback({
        drivers: value.drivers ?? {},
        passengers: value.passengers ?? {},
      });
    },
    (error) => console.warn('[rtdb] subscribeToAllPositions :', error),
  );
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
    await set(statusRef, { online: isOnline, updatedAt: Date.now() });

    if (isOnline) {
      await onDisconnect(statusRef).set({ online: false, updatedAt: Date.now() });
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

