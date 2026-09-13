/**
 * Géolocalisation — API native du navigateur (`navigator.geolocation`).
 *
 * ⚠️ Nécessite un contexte sécurisé : HTTPS (Vercel) ou `localhost`.
 * Aucune dépendance externe (pas d'Expo Location : c'est du web Vite).
 */
import type { GeoPosition, GeoPositionWithTime } from '../types';

export type GeoPermission = 'granted' | 'denied' | 'prompt';

/** Enrichit les erreurs navigateur en message lisible. */
export function describeGeoError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as GeolocationPositionError).code;

    if (code === 1) return 'Géolocalisation refusée. Activez-la pour continuer.';
    if (code === 2) return 'Position indisponible. Vérifiez votre GPS.';
    if (code === 3) return 'Délai de localisation dépassé. Réessayez.';
  }

  return 'Géolocalisation indisponible sur cet appareil.';
}

/** Le navigateur supporte-t-il la géolocalisation ? */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/** Position ponctuelle (déclenche le prompt de permission si nécessaire). */
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  });
}

/** Démarre un suivi continu. Retourne l'identifiant du watch (ou null). */
export function watchPosition(
  callback: (position: GeoPositionWithTime) => void,
  onError?: (error: unknown) => void,
): number | null {
  if (!isGeolocationSupported()) return null;

  return navigator.geolocation.watchPosition(
    (position) =>
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp ?? Date.now(),
      }),
    (error) => onError?.(error),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
  );
}

/** Stoppe un suivi continu. */
export function clearWatch(id: number | null): void {
  if (id !== null && isGeolocationSupported()) {
    navigator.geolocation.clearWatch(id);
  }
}

/** État actuel de la permission (si l'API Permissions est disponible). */
export async function checkPermission(): Promise<GeoPermission> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'prompt';

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state as GeoPermission;
  } catch {
    return 'prompt';
  }
}

/**
 * Demande la permission (déclenche le prompt navigateur).
 * ⚠️ Sur iOS Safari, doit être appelée depuis une action utilisateur (bouton).
 */
export function requestPermission(): Promise<GeoPosition> {
  return getCurrentPosition();
}

/** Distance exacte entre deux points (km, NON arrondie) — filtres fins. */
export function getDistanceKmExact(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

/** Distance entre deux points (km) — arrondie à 100 m près pour l'affichage. */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return Math.round(getDistanceKmExact(lat1, lon1, lat2, lon2) * 10) / 10;
}

/** Déplacement minimal (km) considéré comme significatif — 10 m par défaut. */
export const MIN_MOVE_KM = 0.01;

/**
 * Précision maximale acceptée (mètres) : au-delà, la position est signalée
 * comme IMPRÉCISE (avertissement dans l'UI) mais reste utilisable.
 * ⚠️ Ancien seuil : 50 m — trop strict sur Android, où le GPS renvoie très
 * souvent 50 à 150 m (intérieur, ruelles, premier fix) → le marqueur du
 * chauffeur n'apparaissait jamais chez le client.
 */
export const MAX_ACCURACY_METERS = 100;

/**
 * Au-delà de cette précision (mètres), la mesure est aberrante (position
 * grossière type « antenne relais ») : on la rejette pour éviter que le
 * marqueur saute complètement à côté.
 */
export const REJECT_ACCURACY_METERS = 500;

/**
 * Filtre anti-jitter : le GPS d'un téléphone immobile saute de quelques mètres.
 * On ne considère un déplacement que s'il dépasse `minKm` (distance EXACTE,
 * l'arrondi à 100 m de `getDistanceKm` étant trop grossier pour 10 m).
 */
export function hasMovedEnough(
  previous: GeoPosition | null,
  next: GeoPosition,
  minKm = MIN_MOVE_KM,
): boolean {
  if (!previous) return true;

  const moved = getDistanceKmExact(
    previous.latitude,
    previous.longitude,
    next.latitude,
    next.longitude,
  );

  return moved >= minKm;
}

/** La position est-elle trop imprécise pour être utile ? */
export function isTooImprecise(
  position: GeoPosition,
  maxMeters = MAX_ACCURACY_METERS,
): boolean {
  return typeof position.accuracy === 'number' && position.accuracy > maxMeters;
}

/** Seuil « le chauffeur est tout près » (mètres). */
export const NEAR_DISTANCE_METERS = 100;

/** Seuil « le chauffeur est sur place » (mètres). */
export const ARRIVED_DISTANCE_METERS = 30;

/** Distance exacte entre deux points (MÈTRES) — messages de proximité. */
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return getDistanceKmExact(lat1, lon1, lat2, lon2) * 1000;
}

/** Distance en mètres entre deux positions (null si l'une manque). */
export function distanceBetween(
  from: GeoPosition | null | undefined,
  to: GeoPosition | null | undefined,
): number | null {
  if (!from || !to) return null;
  return getDistanceMeters(from.latitude, from.longitude, to.latitude, to.longitude);
}
