/**
 * Couverture des destinations — SOURCE DE VÉRITÉ : la base de quartiers.
 *
 * Règle métier :
 *   1. la destination correspond à un quartier de `QUARTIERS` → COUVERTE
 *      (détection par identifiant/slug, puis par libellé normalisé) ;
 *   2. la destination correspond à une ville de `DESTINATIONS_HORS_ZONE`
 *      → NON COUVERTE (redirection vers l'écran « zone non couverte ») ;
 *   3. tout autre texte saisi librement → COUVERTE (le chauffeur peut
 *      appeler le client pour confirmer et négocier).
 *
 * ⚠️ On ne compare JAMAIS deux chaînes brutes : les libellés sont normalisés
 * (minuscules, sans accents, tirets/espaces unifiés) — un tiret long « — »
 * ou un accent ne peut donc plus casser la détection de couverture.
 */
import type { DestinationLieu, Quartier } from '../types';
import { DESTINATIONS_HORS_ZONE } from './mock';
import { QUARTIERS, labelQuartier } from './quartiers';

/** Origine de la décision de couverture (utile pour l'affichage et les tests). */
export type CoverageReason = 'quartier' | 'libre' | 'hors-zone';

export interface CoverageResult {
  covered: boolean;
  reason: CoverageReason;
  /** Slug du quartier reconnu (source de vérité de la couverture). */
  quartierId?: string;
  /** Libellé normalisé utilisé pour la comparaison. */
  normalized: string;
}

/**
 * Normalise un libellé de lieu : minuscules, sans accents, tirets et
 * ponctuation remplacés par des espaces simples.
 */
export function normalizeLieu(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Retrouve le quartier couvert correspondant à une destination (ou undefined). */
export function matchQuartier(lieu: DestinationLieu): Quartier | undefined {
  // 1) Source de vérité : l'identifiant (slug) du quartier.
  if (lieu.id) {
    const byId = QUARTIERS.find((quartier) => quartier.id === lieu.id);
    if (byId) return byId;
  }

  const nom = normalizeLieu(lieu.nom);
  if (!nom) return undefined;

  // 2) Libellé d'affichage complet : « Secteur — Lieu ».
  const byLabel = QUARTIERS.find((quartier) => normalizeLieu(labelQuartier(quartier)) === nom);
  if (byLabel) return byLabel;

  // 3) Nom du lieu seul, secteur seul, puis correspondance partielle.
  return QUARTIERS.find((quartier) => {
    const quartierNom = normalizeLieu(quartier.nom);
    const secteur = normalizeLieu(quartier.secteur);

    return (
      quartierNom === nom ||
      secteur === nom ||
      quartierNom.includes(nom) ||
      nom.includes(quartierNom) ||
      nom.includes(secteur)
    );
  });
}

/** La destination correspond-elle à une ville HORS zone ? */
export function matchHorsZone(lieu: DestinationLieu): boolean {
  const nom = normalizeLieu(lieu.nom);
  if (!nom) return false;

  return DESTINATIONS_HORS_ZONE.some((item) => {
    const zone = normalizeLieu(item.name);
    return zone === nom || nom.includes(zone) || zone.includes(nom);
  });
}

/** Détermine la couverture d'une destination (quartier, hors zone ou libre). */
export function resolveCoverage(lieu: DestinationLieu): CoverageResult {
  const normalized = normalizeLieu(lieu.nom);
  const quartier = matchQuartier(lieu);

  if (quartier) {
    return { covered: true, reason: 'quartier', quartierId: quartier.id, normalized };
  }

  if (matchHorsZone(lieu)) {
    return { covered: false, reason: 'hors-zone', normalized };
  }

  // Saisie libre : acceptée, le chauffeur pourra confirmer par téléphone.
  return { covered: true, reason: 'libre', normalized };
}

/** Raccourci booléen : la destination est-elle dans la zone couverte ? */
export function isDestinationCovered(lieu: DestinationLieu): boolean {
  return resolveCoverage(lieu).covered;
}
