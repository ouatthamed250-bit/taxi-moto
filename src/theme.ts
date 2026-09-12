/** Palette et règles métier Taxi-Moto */

export const COLORS = {
  navy: '#062B67',
  blue: '#0B5FFF',
  orange: '#FF7A00',
  yellow: '#FFB000',
  white: '#FFFFFF',
  green: '#009E60',
  grayLight: '#F5F5F7',
  gray: '#8E8E93',
  text: '#1C1C1E',
  red: '#E5484D',
} as const;

/** Commission plateforme : 10 % de chaque course. */
export const COMMISSION_RATE = 0.10;

/* ===================== BARÈME TAXI-MOTO (SOURCE UNIQUE) ===================== */

/** Prix de base (FCFA) — couvre les 2 premiers kilomètres. */
export const MIN_FARE = 1000;

/** Prix maximal d'une course (FCFA) — jamais dépassé, même sur très longue distance. */
export const MAX_FARE = 3000;

/** Distance couverte par le prix de base (km). */
export const BASE_DISTANCE_KM = 2;

/** Tarif par km supplémentaire de 2 à 10 km (FCFA). */
export const RATE_TIER_1 = 150;

/** Tarif par km supplémentaire au-delà de 10 km (FCFA). */
export const RATE_TIER_2 = 100;

/** Fin du premier palier (km) : au-delà, le tarif au km baisse. */
export const TIER_1_LIMIT_KM = 10;

/** Montant atteint à la fin du premier palier (10 km) — base du second palier. */
export const TIER_1_MAX_FARE = 2000;

/** Arrondit à la dizaine la plus proche. */
function roundToTen(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Prix EXACT selon le barème (hors fourchette) :
 *   • jusqu'à 2 km ................. 1 000 F (forfait de base)
 *   • de 2 à 10 km ................. +150 F par km, plafonné à 2 000 F
 *   • au-delà de 10 km ............. +100 F par km depuis 2 000 F
 *   • plafond absolu ............... 3 000 F
 *
 * Exemples : 1→1000 · 2→1000 · 3→1150 · 5→1450 · 8→1900 · 10→2000
 *            15→2500 · 20→3000 · 30→3000 (plafonné)
 */
export function computeExactFare(distanceKm: number): number {
  const distance = Math.max(0, distanceKm);
  if (distance <= BASE_DISTANCE_KM) return MIN_FARE;

  // Premier palier : 150 F/km de 2 à 10 km, plafonné à 2 000 F.
  let fare =
    MIN_FARE + (Math.min(distance, TIER_1_LIMIT_KM) - BASE_DISTANCE_KM) * RATE_TIER_1;
  fare = Math.min(fare, TIER_1_MAX_FARE);

  // Second palier : 100 F/km au-delà de 10 km, en repartant de 2 000 F.
  if (distance > TIER_1_LIMIT_KM) {
    fare += (distance - TIER_1_LIMIT_KM) * RATE_TIER_2;
  }

  return Math.min(MAX_FARE, roundToTen(fare));
}

/** Ramène un prix dans le barème [1 000 ; 3 000] FCFA. */
export function clampFare(value: number): number {
  if (!Number.isFinite(value)) return MIN_FARE;
  return Math.min(MAX_FARE, Math.max(MIN_FARE, Math.round(value)));
}

/**
 * Estimation d'une course : **prix conseillé** + fourchette (± 100 F, bornée
 * au barème).
 *
 * ⚠️ SOURCE UNIQUE DES PRIX : aucune page ne doit écrire un prix en dur.
 */
export function estimateFare(distanceKm: number): {
  min: number;
  max: number;
  exact: number;
} {
  const exact = computeExactFare(distanceKm);

  return {
    exact,
    min: Math.max(MIN_FARE, exact - 100),
    max: Math.min(MAX_FARE, exact + 100),
  };
}

/** Coordonnées par défaut : Abidjan. */
export const ABIDJAN_CENTER: [number, number] = [5.359952, -4.008256];

export interface VehicleInfo {
  max: number;
  label: string;
  emoji: string;
  description: string;
}

export const VEHICLES = {
  moto: { max: 2, label: 'Moto', emoji: '🏍️', description: '1 à 2 passagers' },
  tricycle: { max: 4, label: 'Tricycle', emoji: '🛺', description: "Jusqu'à 4 passagers" },
} as const;

/** Commission plateforme (10 %). */
export function commissionOf(price: number): number {
  return Math.round(price * COMMISSION_RATE);
}

/** Revenu net conducteur après commission. */
export function netEarnings(price: number): number {
  return price - commissionOf(price);
}

/** Formatage FCFA. */
export function fcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}
