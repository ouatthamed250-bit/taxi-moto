/**
 * Demandes de course (Realtime Database) — règles PURES et testables.
 *
 * ⚠️ Une demande publiée dans `/rideRequests` n'est valable que 30 s : sans
 * acceptation, elle est PÉRIMÉE. Les résidus (application fermée sans
 * annulation, anciens tests) restaient sinon dans la base et rejouaient le son
 * d'alerte chez les conducteurs à chaque passage en ligne.
 */
import type { RideRequest } from '../types';

/** Durée de vie d'une demande de course (ms). */
export const RIDE_REQUEST_TTL_MS = 30_000;

/**
 * Une demande est-elle encore valable ?
 *
 * ⚠️ `createdAt` ABSENT = donnée antérieure à l'ajout du champ → considérée
 * PÉRIMÉE (c'est exactement le résidu qui déclenchait le bip à tort).
 */
export function isRequestFresh(
  request: Pick<RideRequest, 'createdAt'>,
  now = Date.now(),
  ttlMs = RIDE_REQUEST_TTL_MS,
): boolean {
  const created = request.createdAt;
  if (typeof created !== 'number' || !Number.isFinite(created)) return false;

  return now - created <= ttlMs;
}

/** Âge d'une demande en millisecondes (null si l'horodatage est absent). */
export function requestAgeMs(
  request: Pick<RideRequest, 'createdAt'>,
  now = Date.now(),
): number | null {
  const created = request.createdAt;
  if (typeof created !== 'number' || !Number.isFinite(created)) return null;
  return Math.max(0, now - created);
}

/** Sépare les demandes valides des résidus (à supprimer). */
export function splitRequestsByAge(
  requests: RideRequest[],
  now = Date.now(),
  ttlMs = RIDE_REQUEST_TTL_MS,
): { fresh: RideRequest[]; stale: RideRequest[] } {
  const fresh: RideRequest[] = [];
  const stale: RideRequest[] = [];

  for (const request of requests) {
    if (isRequestFresh(request, now, ttlMs)) fresh.push(request);
    else stale.push(request);
  }

  return { fresh, stale };
}
