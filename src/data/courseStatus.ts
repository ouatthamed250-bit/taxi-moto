/**
 * Suivi de course — correspondance entre le statut PARTAGÉ (Firestore) et le
 * statut d'affichage du store, plus les étapes pilotées par le conducteur.
 */
import type { CourseStatus, RideStatus } from '../types';

/** Statut Firestore (`rides/{id}.status`) → statut d'affichage du store. */
export const RIDE_STATUS_BY_COURSE: Record<CourseStatus, RideStatus> = {
  pending: 'searching',
  accepted: 'driver_found',
  arrived: 'driver_arrived',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

/** Statut d'affichage → statut Firestore (quand le client fait avancer). */
export const COURSE_STATUS_BY_RIDE: Record<RideStatus, CourseStatus> = {
  idle: 'pending',
  searching: 'pending',
  offers: 'pending',
  driver_found: 'accepted',
  driver_arriving: 'accepted',
  driver_arrived: 'arrived',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

/** Libellés lisibles d'un statut de course. */
export const COURSE_LABEL: Record<CourseStatus, string> = {
  pending: 'En attente d’un chauffeur',
  accepted: 'Chauffeur en route',
  arrived: 'Chauffeur arrivé',
  in_progress: 'Course en cours',
  completed: 'Course terminée',
  cancelled: 'Course annulée',
};

/** Étapes du suivi, dans l'ordre logique (pilotées par le conducteur). */
export const DRIVER_STEPS: { status: CourseStatus; label: string }[] = [
  { status: 'accepted', label: 'Je vais chercher le client' },
  { status: 'arrived', label: 'Je suis arrivé' },
  { status: 'in_progress', label: 'Démarrer la course' },
  { status: 'completed', label: 'Terminer la course' },
];

/** Index de l'étape correspondant à un statut (-1 si inconnu). */
export function driverStepIndex(status: CourseStatus): number {
  return DRIVER_STEPS.findIndex((step) => step.status === status);
}
