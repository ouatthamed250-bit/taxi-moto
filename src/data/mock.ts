// Mock vidé - seules les vraies données utilisateur (localStorage) sont utilisées.
//
// Ce fichier ne conserve que des DONNÉES DE RÉFÉRENCE (villes, destinations)
// et des valeurs vides neutres. Aucune donnée fictive (conducteurs, courses,
// statistiques) n'est simulée : tout provient désormais des comptes réels
// enregistrés via `services/authLocal.ts` (localStorage).

import type { AdminStats, Destination, DriverProfile, Ride, ZonePriceRule } from '../types';

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

/** Destinations de référence — certaines zones ne sont PAS encore couvertes. */
export const DESTINATIONS: Destination[] = [
  { name: 'Cocody — Angré 7e Tranche', distanceKm: 3.4, covered: true },
  { name: 'Plateau — Cité Administrative', distanceKm: 6.1, covered: true },
  { name: 'Yopougon — Niangon Sud', distanceKm: 8.7, covered: true },
  { name: 'Adjamé — Marché Gouro', distanceKm: 4.2, covered: true },
  { name: 'Marcory — Zone 4', distanceKm: 9.3, covered: true },
  { name: 'Bingerville', distanceKm: 14.5, covered: false },
  { name: 'Anyama', distanceKm: 16.2, covered: false },
  { name: 'Grand-Bassam', distanceKm: 32.0, covered: false },
];

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
