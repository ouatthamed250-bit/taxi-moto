/**
 * Historique des courses — règles UNIQUES (conducteur, client, admin).
 *
 * ⚠️ Pourquoi ce module ? L'historique était construit "à la main" à plusieurs
 * endroits, avec des entrées ajoutées à l'ACCEPTATION (statut `completed` posé
 * par erreur !) puis de nouveau à la COMPLÉTION → même course en double, dans le
 * désordre, mélangée avec les courses en cours, et commission débitée deux fois.
 *
 * Règles retenues :
 *   1. une course = UN document Firestore = une seule entrée (dédup par `id`) ;
 *   2. l'historique ne contient QUE les courses `completed` ou `cancelled` ;
 *   3. tri STABLE et déterministe : date+heure décroissantes, puis `id` ;
 *   4. les dates sont comparées via `daysSinceRide` (format `dd/mm/yyyy`).
 */
import type { CourseStatus, Ride } from '../types';

/** Périodes proposées par les filtres d'historique. */
export type RidePeriod = 'today' | 'week' | 'all';

/** Statuts VISIBLES dans un historique (la course est finie). */
export const FINISHED_STATUSES: CourseStatus[] = ['completed', 'cancelled'];

/** La course est-elle terminée/annulée (donc dans l'historique) ? */
export function isFinishedRide(ride: Ride): boolean {
  return FINISHED_STATUSES.includes(ride.status);
}

/** Nombre de jours affichés par le filtre « Cette semaine » (7 derniers jours). */
export const WEEK_DAYS = 7;

/** Horodatage d'une course (`dd/mm/yyyy` + `HH:mm`) — 0 si illisible. */
export function rideTimestamp(ride: Ride): number {
  const dateParts = (ride.date ?? '').split('/');
  const timeParts = (ride.time ?? '').split(':');

  if (dateParts.length !== 3) return 0;

  const day = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const year = Number(dateParts[2]);
  if (!day || !month || !year) return 0;

  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);

  return new Date(
    year,
    month - 1,
    day,
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
  ).getTime();
}

/**
 * Tri STABLE : la plus récente en haut (date puis heure), et en cas d'égalité
 * stricte on départage par `id` → l'ordre ne change jamais entre deux rendus.
 */
export function sortRidesDesc(rides: Ride[]): Ride[] {
  return [...rides].sort((a, b) => {
    const diff = rideTimestamp(b) - rideTimestamp(a);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Nettoie une liste d'historique : dédoublonnage par `id` (la dernière version
 * connue gagne, une course = un document) + statuts terminés + tri décroissant.
 */
export function normalizeRideHistory(rides: Ride[]): Ride[] {
  const byId = new Map<string, Ride>();

  for (const ride of rides) {
    if (!ride.id || !isFinishedRide(ride)) continue;
    byId.set(ride.id, ride);
  }

  return sortRidesDesc([...byId.values()]);
}

/**
 * Fusionne l'historique courant avec des courses entrantes (Firestore).
 * Les entrées entrantes remplacent les locales de même `id` (source de vérité).
 */
export function mergeRideHistory(current: Ride[], incoming: Ride[]): Ride[] {
  return normalizeRideHistory([...current, ...incoming]);
}

/** Date du jour au format `dd/mm/yyyy` (même format que `nowDate()`). */
export function todayStamp(now = new Date()): string {
  return now.toLocaleDateString('fr-FR');
}

/** Jours écoulés depuis la course (0 = aujourd'hui, -1 = date illisible). */
export function daysSinceRide(ride: Ride, now = new Date()): number {
  const stamp = rideTimestamp(ride);
  if (!stamp) return -1;

  const rideDate = new Date(stamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round(
    (today.getTime() - new Date(
      rideDate.getFullYear(),
      rideDate.getMonth(),
      rideDate.getDate(),
    ).getTime()) / 86400000,
  );
}

/** La course appartient-elle à la période demandée ? */
export function inRidePeriod(ride: Ride, period: RidePeriod, now = new Date()): boolean {
  if (period === 'all') return true;

  const days = daysSinceRide(ride, now);
  if (days < 0) return false;

  return period === 'today' ? days === 0 : days < WEEK_DAYS;
}

/** Historique filtré par période (tri conservé : plus récent en haut). */
export function filterRidesByPeriod(
  rides: Ride[],
  period: RidePeriod,
  now = new Date(),
): Ride[] {
  return rides.filter((ride) => inRidePeriod(ride, period, now));
}

/** Nombre de courses par filtre (badges d'onglets). */
export function countRidesByPeriod(rides: Ride[], now = new Date()): Record<RidePeriod, number> {
  return {
    today: filterRidesByPeriod(rides, 'today', now).length,
    week: filterRidesByPeriod(rides, 'week', now).length,
    all: rides.length,
  };
}
