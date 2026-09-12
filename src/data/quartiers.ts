// ============================================================================
// Base de quartiers — ZONE DE COUVERTURE Taxi-Moto
// ============================================================================
// Zone couverte : Adjouffou → Modeste (avant le péage), + Anani, Jean-Folly
// et le Carrefour Aéroport (Derrière Wharf).
//
// Base extensible - ajouter d'autres quartiers au fur et à mesure :
//   il suffit d'ajouter une entrée `{ id, nom, secteur, repere }` dans QUARTIERS.
//   Le quartier apparaît automatiquement dans le sélecteur du passager
//   (regroupé par `secteur`) et devient une destination couverte par la zone.
//   ⚠️ `id` doit rester unique (slug) et `secteur` sert de regroupement d'affichage.
// ============================================================================

import type { GeoPosition, Quartier } from '../types';

/**
 * Distance moyenne d'une course dans la zone (km).
 * Sert d'estimation par défaut : la distance réelle dépend de la position du
 * client et n'est pas connue tant que le calcul d'itinéraire n'est pas branché.
 */
export const DISTANCE_ZONE_MOYENNE_KM = 4;

/** Quartiers couverts par Taxi-Moto (1 entrée = 1 lieu proposé au client). */
export const QUARTIERS: Quartier[] = [
  /* ---------- ADJOUFFOU ---------- */
  {
    id: 'adjouffou-1er-arret',
    nom: '1er Arrêt',
    secteur: 'Adjouffou',
    repere: 'Premier arrêt d’Adjouffou',
  },
  {
    id: 'adjouffou-2e-arret',
    nom: '2è Arrêt',
    secteur: 'Adjouffou',
    repere: 'Deuxième arrêt d’Adjouffou',
  },
  {
    id: 'adjouffou-boutique-omo',
    nom: 'Boutique Omo',
    secteur: 'Adjouffou',
    repere: 'Boutique Omo',
  },
  {
    id: 'adjouffou-carrefour-casier',
    nom: 'Carrefour Casier',
    secteur: 'Adjouffou',
    repere: 'Carrefour Casier',
  },
  {
    id: 'adjouffou-belleville',
    nom: 'Belleville',
    secteur: 'Adjouffou',
    repere: 'Belleville',
  },

  /* ---------- GONZAGUEVILLE ---------- */
  {
    id: 'gonzagueville-terre-rouge',
    nom: 'Terre Rouge',
    secteur: 'Gonzagueville',
    repere: 'Terre Rouge',
  },
  {
    id: 'gonzagueville-elephant',
    nom: 'Éléphant',
    secteur: 'Gonzagueville',
    repere: 'Éléphant',
  },
  {
    id: 'gonzagueville-carrefour-mallet',
    nom: 'Carrefour Mallet',
    secteur: 'Gonzagueville',
    repere: 'Carrefour Mallet',
  },

  /* ---------- ANANI ---------- */
  {
    id: 'anani-abraham',
    nom: 'Abraham',
    secteur: 'Anani',
    repere: 'Abraham',
  },

  /* ---------- JEAN-FOLLY ---------- */
  {
    id: 'jean-folly',
    nom: 'Jean-Folly',
    secteur: 'Jean-Folly',
    repere: 'Jean-Folly',
  },

  /* ---------- MODESTE ---------- */
  {
    id: 'modeste',
    nom: 'Modeste',
    secteur: 'Modeste',
    repere: 'Modeste (avant le péage)',
  },

  /* ---------- CARREFOUR AÉROPORT ---------- */
  {
    id: 'carrefour-aeroport',
    nom: 'Carrefour Aéroport',
    secteur: 'Carrefour Aéroport',
    repere: 'Derrière Wharf',
  },
];

/** Nom affiché d'un quartier : « Secteur — Lieu » (ou simplement le lieu). */
export function labelQuartier(quartier: Quartier): string {
  return quartier.secteur === quartier.nom
    ? quartier.nom
    : `${quartier.secteur} — ${quartier.nom}`;
}

/** Quartiers regroupés par secteur (pour les `<optgroup>` du sélecteur). */
export const QUARTIERS_PAR_SECTEUR: { secteur: string; quartiers: Quartier[] }[] =
  QUARTIERS.reduce<{ secteur: string; quartiers: Quartier[] }[]>((groups, quartier) => {
    const group = groups.find((item) => item.secteur === quartier.secteur);

    if (group) {
      group.quartiers.push(quartier);
      return groups;
    }

    groups.push({ secteur: quartier.secteur, quartiers: [quartier] });
    return groups;
  }, []);

/** Retrouve un quartier par son identifiant unique. */
export function findQuartierById(id: string): Quartier | undefined {
  return QUARTIERS.find((quartier) => quartier.id === id);
}

/** Retrouve un quartier par son nom affiché (valeur du sélecteur). */
export function findQuartierByLabel(label: string): Quartier | undefined {
  return QUARTIERS.find((quartier) => labelQuartier(quartier) === label);
}

/**
 * Coordonnées GPS des quartiers (latitude / longitude).
 *
 * ⚠️ À RELEVER SUR LE TERRAIN (ou via un service de géocodage) : tant qu'une
 * entrée est absente, le marqueur de destination n'est pas affiché sur la carte
 * (on n'invente AUCUNE position). Exemple de saisie :
 *   'modeste': { latitude: 5.xxxx, longitude: -3.xxxx },
 */
export const QUARTIER_COORDS: Record<string, GeoPosition> = {};

/** Coordonnées connues d'un quartier (null si non relevées). */
export function coordsOfQuartier(quartierId: string | undefined): GeoPosition | null {
  if (!quartierId) return null;
  return QUARTIER_COORDS[quartierId] ?? null;
}
