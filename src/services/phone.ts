/**
 * Numéros de téléphone — normalisation et variantes d'écriture.
 *
 * Module PUR (aucune dépendance) : il est utilisé par `authService` et peut
 * être vérifié isolément.
 *
 * Contexte Côte d'Ivoire : les formulaires affichent un préfixe « +225 ».
 * Le même numéro peut donc être saisi de plusieurs façons :
 *   « +225 05 54 23 32 34 » · « 2250554233234 » · « 0554233234 » · « 554233234 »
 */

/** Chiffres uniquement (« +225 05-54-23-32-34 » → « 2250554233234 »). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Toutes les écritures courantes d'un même numéro.
 * Permet de retrouver un compte existant quel que soit le format saisi.
 */
export function phoneVariants(phone: string): string[] {
  const digits = normalizePhone(phone);
  if (!digits) return [];

  const local = digits.replace(/^225/, ''); // sans indicatif pays
  const national = local.replace(/^0/, ''); // sans zéro initial

  return [
    ...new Set([
      digits, // tel que saisi
      local, // sans indicatif
      `225${local}`, // avec indicatif
      national, // sans zéro initial
      `0${national}`, // avec zéro initial
      `2250${national}`, // indicatif + zéro initial
    ]),
  ].filter((value) => value.length >= 8);
}
