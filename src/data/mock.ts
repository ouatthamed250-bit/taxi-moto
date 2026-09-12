// Mock vidé - seules les vraies données utilisateur (localStorage) sont utilisées.
//
// Ce fichier ne conserve que des DONNÉES DE RÉFÉRENCE (villes, destinations)
// et des valeurs vides neutres. Aucune donnée fictive (conducteurs, courses,
// statistiques) n'est simulée : tout provient désormais des comptes réels
// enregistrés via `services/authLocal.ts` (localStorage).

import type { AdminStats, Destination, DriverProfile, Ride, ZonePriceRule } from '../types';
import { DISTANCE_ZONE_MOYENNE_KM, QUARTIERS, labelQuartier } from './quartiers';

/** Villes couvertes par la carte Taxi-Moto (donnée de référence). */
export const CITIES = [
  'Abidjan',
  'Bouaké',
  'Yamoussoukro',
  'Korhogo',
  'Daloa',
  'San-Pédro',
  'Man',
];

/**
 * Destinations de la ZONE COUVERTE (issues de la base de quartiers).
 * Tous les quartiers de `QUARTIERS` sont couverts → commande possible.
 * La distance réelle n'est pas encore calculée : on utilise la distance
 * moyenne de zone comme base d'estimation.
 */
export const DESTINATIONS_ZONE: Destination[] = QUARTIERS.map((quartier) => ({
  name: labelQuartier(quartier),
  distanceKm: DISTANCE_ZONE_MOYENNE_KM,
  covered: true,
}));

/** Destinations HORS zone de couverture (commande refusée). */
export const DESTINATIONS_HORS_ZONE: Destination[] = [
  { name: 'Bingerville', distanceKm: 14.5, covered: false },
  { name: 'Anyama', distanceKm: 16.2, covered: false },
  { name: 'Grand-Bassam', distanceKm: 32.0, covered: false },
  { name: 'Abidjan centre — hors zone', distanceKm: 12.4, covered: false },
];

/** Destinations de référence = zone couverte (quartiers) + hors zone. */
export const DESTINATIONS: Destination[] = [
  ...DESTINATIONS_ZONE,
  ...DESTINATIONS_HORS_ZONE,
];

/** Réexport pratique de la base de quartiers (zone de couverture). */
export { QUARTIERS };

/** Aucun conducteur simulé : les conducteurs viennent des comptes réels. */
export const DRIVERS: DriverProfile[] = [];

/** Historique de courses vide (seules les vraies courses sont conservées). */
export const RIDE_HISTORY: Ride[] = [];

/** Courses du jour vides (aucune simulation). */
export const DRIVER_TODAY_RIDES: Ride[] = [];

/** Règles tarifaires : aucune par défaut (créées par l'administrateur). */
export const ZONE_RULES: ZonePriceRule[] = [];

/** Statistiques admin : tout à zéro (calculées sur les vraies données). */
export const ADMIN_STATS: AdminStats = {
  passengers: 0,
  drivers: 0,
  driversOnline: 0,
  ridesToday: 0,
  ridesActive: 0,
  ridesCompleted: 0,
  revenue: 0,
};

/** Aucune course simulée. */
export const ADMIN_RIDES: Ride[] = [];
