/**
 * Négociation de prix client ↔ chauffeur — logique PURE (testable).
 *
 * Règles métier :
 *   • 3 tours maximum (un tour = une contre-offre du client + la réponse du
 *     chauffeur) ;
 *   • un tour sans réponse pendant 60 s expire automatiquement ;
 *   • si les 3 tours sont épuisés sans accord, la course est retirée du
 *     chauffeur et proposée à un autre.
 */
import type { Negotiation, NegotiationMessage, NegotiationStatus } from '../types';

/** Nombre de tours de négociation autorisés. */
export const MAX_NEGOTIATION_ROUNDS = 3;

/** Délai maximal (ms) sans réponse avant expiration d'un tour. */
export const NEGOTIATION_TIMEOUT_MS = 60_000;

/** Le prix proposé doit rester dans le barème (1 000 – 3 000 F). */
export const MIN_NEGOTIATION_FARE = 1000;
export const MAX_NEGOTIATION_FARE = 3000;

/** Les tours consommés : une contre-offre CLIENT = un tour. */
export function countRounds(rounds: NegotiationMessage[]): number {
  return rounds.filter((round) => round.from === 'passenger').length;
}

/** Peut-on encore négocier ? (moins de 3 tours client consommés) */
export function canNegotiate(rounds: NegotiationMessage[]): boolean {
  return countRounds(rounds) < MAX_NEGOTIATION_ROUNDS;
}

/** Dernier montant proposé (par l'un ou l'autre), avec repli sur le prix initial. */
export function lastAmount(
  rounds: NegotiationMessage[],
  fallback: number,
): number {
  const last = rounds[rounds.length - 1];
  return last ? last.amount : fallback;
}

/** Un message est-il expiré (sans réponse depuis plus de 60 s) ? */
export function isTimedOut(
  rounds: NegotiationMessage[],
  status: NegotiationStatus,
  now: number,
): boolean {
  if (status !== 'pending' && status !== 'negotiating') return false;

  const last = rounds[rounds.length - 1];
  if (!last) return false;

  return now - last.timestamp >= NEGOTIATION_TIMEOUT_MS;
}

/** Construit l'objet de négociation exposé par le store. */
export function toNegotiation(
  rounds: NegotiationMessage[],
  status: NegotiationStatus,
): Negotiation {
  return {
    rounds,
    currentRound: Math.min(MAX_NEGOTIATION_ROUNDS, Math.max(1, countRounds(rounds) || 1)),
    status,
  };
}

/** Libellé du tour affiché (« Tour 2/3 »). */
export function roundLabel(rounds: NegotiationMessage[]): string {
  const consumed = Math.min(MAX_NEGOTIATION_ROUNDS, Math.max(1, countRounds(rounds) || 1));
  return `Tour ${consumed}/${MAX_NEGOTIATION_ROUNDS}`;
}

/** Historique lisible (« Tour 1 : Client 1300 F → Chauffeur 1400 F »). */
export function describeRounds(
  rounds: NegotiationMessage[],
  fcfaFormat: (value: number) => string,
): string[] {
  return rounds.map(
    (message, index) =>
      `${index + 1}. ${message.from === 'passenger' ? 'Client' : 'Chauffeur'} : ${fcfaFormat(message.amount)}`,
  );
}
