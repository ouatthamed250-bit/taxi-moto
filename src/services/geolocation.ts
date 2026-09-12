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

/** Distance entre deux points (km) — formule de Haversine. */
export function getDistanceKm(
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

  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(a)) * 10) / 10;
}
