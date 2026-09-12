/**
 * Négociation de prix client ↔ chauffeur — logique PURE (testable).
 *
 * Règles métier :
 *   • 3 tours maximum (un tour = une contre-offre du client + la réponse du
 *     chauffeur) ;
 *   • un tour sans réponse pendant 60 s expire automatiquement ;
 *   • si les 3 tours sont épuisés sans accord, la course est retirée du
 *     chauffeur et proposée à un autre ;
 *   • **on joue chacun son tour** : après avoir proposé, on ATTEND la réponse de
 *     l'autre partie (on ne peut donc jamais accepter SA PROPRE proposition) ;
 *   • la course ne démarre QUE lorsque l'accord est scellé : le chauffeur
 *     accepte (il crée la course) ou le client accepte la proposition du
 *     chauffeur (le chauffeur crée la course).
 */
import type { Negotiation, NegotiationMessage, NegotiationStatus } from '../types';

/** Nombre de tours de négociation autorisés (client + chauffeur). */
export const MAX_NEGOTIATION_ROUNDS = 3;

/** Nombre TOTAL de messages d'une négociation complète (3 client + 3 chauffeur). */
export const MAX_NEGOTIATION_MESSAGES = MAX_NEGOTIATION_ROUNDS * 2;

/** Délai maximal (ms) sans réponse avant expiration d'un tour. */
export const NEGOTIATION_TIMEOUT_MS = 60_000;

/** Le prix proposé doit rester dans le barème (1 000 – 3 000 F). */
export const MIN_NEGOTIATION_FARE = 1000;
export const MAX_NEGOTIATION_FARE = 3000;

/** Contre-offres du CLIENT (= nombre de ses messages). */
export function countPassengerRounds(rounds: NegotiationMessage[]): number {
  return rounds.filter((round) => round.from === 'passenger').length;
}

/** Contre-offres du CHAUFFEUR (son offre INITIALE ne compte pas). */
export function countDriverRounds(rounds: NegotiationMessage[]): number {
  return Math.max(0, rounds.filter((round) => round.from === 'driver').length - 1);
}

/**
 * Nombre de contre-offres échangées (tous camps confondus).
 * L'offre INITIALE du chauffeur ne compte pas.
 */
export function countCounterOffers(rounds: NegotiationMessage[]): number {
  return Math.max(0, rounds.length - 1);
}

/**
 * Les tours consommés : une contre-offre CLIENT = un tour.
 * (Conservé pour la compatibilité : voir `currentRound` pour l'affichage.)
 */
export function countRounds(rounds: NegotiationMessage[]): number {
  return countPassengerRounds(rounds);
}

/**
 * Numéro du tour EN COURS (1 à 3).
 *
 * Un TOUR = un échange COMPLET (contre-offre client + réponse chauffeur) :
 *   [chauffeur 1500]                    → Tour 1
 *   [chauffeur 1500, client 1300]       → Tour 1
 *   [.., chauffeur 1400]                → Tour 2   ← le compteur avance
 *   [.., client 1350]                   → Tour 2
 *   [.., chauffeur 1380]                → Tour 3
 *   [.., client 1360]                   → Tour 3 (limite client atteinte)
 */
export function currentRound(rounds: NegotiationMessage[]): number {
  const exchanges = Math.floor(countCounterOffers(rounds) / 2) + 1;
  return Math.min(MAX_NEGOTIATION_ROUNDS, Math.max(1, exchanges));
}

/** Le CLIENT peut-il ENCORE envoyer une contre-offre ? */
export function canPassengerCounter(rounds: NegotiationMessage[]): boolean {
  return countPassengerRounds(rounds) < MAX_NEGOTIATION_ROUNDS;
}

/** Le CHAUFFEUR peut-il ENCORE envoyer une contre-offre ? */
export function canDriverCounter(rounds: NegotiationMessage[]): boolean {
  return countDriverRounds(rounds) < MAX_NEGOTIATION_ROUNDS;
}

/** Peut-on encore négocier ? (côté CLIENT — conservé pour l'UI historique) */
export function canNegotiate(rounds: NegotiationMessage[]): boolean {
  return canPassengerCounter(rounds);
}

/** Les DEUX camps ont épuisé leurs contre-offres → plus d'accord possible. */
export function isNegotiationExhausted(rounds: NegotiationMessage[]): boolean {
  return !canPassengerCounter(rounds) && !canDriverCounter(rounds);
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

/** Dernier message échangé (null si aucune négociation). */
export function lastRound(rounds: NegotiationMessage[]): NegotiationMessage | null {
  return rounds.length > 0 ? rounds[rounds.length - 1] : null;
}

/** Qui a parlé en DERNIER ? (null si aucune négociation) */
export function lastRoundFrom(
  rounds: NegotiationMessage[],
): 'passenger' | 'driver' | null {
  return lastRound(rounds)?.from ?? null;
}

/**
 * Le CLIENT vient de proposer → on ATTEND la réponse du chauffeur.
 * (Le client ne doit alors PLUS pouvoir accepter : ce serait accepter SA
 * propre proposition.)
 */
export function isAwaitingDriverResponse(rounds: NegotiationMessage[]): boolean {
  return lastRoundFrom(rounds) === 'passenger';
}

/** Le CHAUFFEUR vient de proposer → on attend la réponse du client. */
export function isAwaitingPassengerResponse(rounds: NegotiationMessage[]): boolean {
  return lastRoundFrom(rounds) === 'driver';
}

/**
 * Le CLIENT peut-il accepter l'offre ?
 *
 * ⚠️ Uniquement si la dernière proposition vient du CHAUFFEUR (ou qu'aucune
 * négociation n'a commencé). Sinon la course démarrerait au prix du client SANS
 * l'accord du chauffeur (bug « auto-acceptation de sa propre proposition »).
 */
export function canPassengerAcceptOffer(rounds: NegotiationMessage[]): boolean {
  return !isAwaitingDriverResponse(rounds);
}

/** Montant de la dernière proposition du CHAUFFEUR (repli : prix de l'offre). */
export function lastDriverAmount(
  rounds: NegotiationMessage[],
  fallback: number,
): number {
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].from === 'driver') return rounds[index].amount;
  }
  return fallback;
}

/** Montant de la dernière proposition du CLIENT (null si aucune). */
export function lastPassengerAmount(rounds: NegotiationMessage[]): number | null {
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].from === 'passenger') return rounds[index].amount;
  }
  return null;
}

/** Construit l'objet de négociation exposé par le store. */
export function toNegotiation(
  rounds: NegotiationMessage[],
  status: NegotiationStatus,
): Negotiation {
  return {
    rounds,
    currentRound: currentRound(rounds),
    status,
  };
}

/**
 * Libellé du tour affiché (« Tour 2/3 »).
 * Le compteur avance à chaque ÉCHANGE COMPLET (voir `currentRound`).
 */
export function roundLabel(rounds: NegotiationMessage[]): string {
  return `Tour ${currentRound(rounds)}/${MAX_NEGOTIATION_ROUNDS}`;
}

/**
 * Historique lisible des tours.
 * `self` = le camp qui affiche l'historique → ses propres tours sont « Vous »
 * (« 1. Chauffeur : 1 200 F · 2. Vous : 1 000 F · 3. Chauffeur : 1 400 F »).
 */
export function describeRounds(
  rounds: NegotiationMessage[],
  fcfaFormat: (value: number) => string,
  self: 'passenger' | 'driver' = 'passenger',
): string[] {
  return rounds.map((message, index) => {
    const label =
      message.from === self
        ? 'Vous'
        : message.from === 'passenger'
          ? 'Client'
          : 'Chauffeur';

    return `${index + 1}. ${label} : ${fcfaFormat(message.amount)}`;
  });
}
