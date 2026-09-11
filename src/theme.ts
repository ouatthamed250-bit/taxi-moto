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

/** Commission plateforme : 7 % de chaque course. */
export const COMMISSION_RATE = 0.07;

/** Prix minimum d'une course (FCFA) — le conducteur propose au-delà. */
export const MIN_FARE = 1000;

/** Tarif maximum conseillé par défaut (FCFA) — pas un plafond national définitif. */
export const SUGGESTED_MAX_FARE = 5000;

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

/** Calcule prix estimé + fourchette habituelle à partir de la distance. */
export function estimateFare(distanceKm: number): { min: number; max: number } {
  const raw = MIN_FARE + distanceKm * 300;
  const min = Math.max(MIN_FARE, Math.round(raw / 100) * 100);
  const max = Math.round((min * 1.3) / 100) * 100;
  return { min, max };
}

/** Commission plateforme (7 %). */
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
