/**
 * Accès administrateur caché — code d'accès + session navigateur.
 *
 * ⚠️ Prototype : le code est « haché » par une transformation simple (base64),
 * suffisant pour ne pas le stocker en clair. À remplacer par Firebase plus tard.
 *
 * Clés :
 *   - localStorage  'taxi-moto:admin-code'    → code admin (haché)
 *   - sessionStorage 'taxi-moto:admin-session' → session (expire à la fermeture)
 */

const CODE_KEY = 'taxi-moto:admin-code';
const SESSION_KEY = 'taxi-moto:admin-session';

/** Code d'accès par défaut. */
export const DEFAULT_ADMIN_CODE = '240688';

/** Longueur attendue du code. */
export const ADMIN_CODE_LENGTH = 6;

/** Hash simple du code (décalage + base64). */
export function hashAdminCode(code: string): string {
  const shifted = code
    .split('')
    .map((char) => String.fromCharCode(char.charCodeAt(0) + 7))
    .join('');

  try {
    return window.btoa(shifted);
  } catch {
    return shifted;
  }
}

/** Code admin courant (hashé) ou hash du code par défaut. */
export function getAdminCode(): string {
  try {
    return window.localStorage.getItem(CODE_KEY) ?? hashAdminCode(DEFAULT_ADMIN_CODE);
  } catch {
    return hashAdminCode(DEFAULT_ADMIN_CODE);
  }
}

/** Vérifie un code saisi contre le code enregistré. */
export function verifyAdminCode(code: string): boolean {
  return hashAdminCode(code) === getAdminCode();
}

/** Remplace le code admin (après vérification de l'ancien). */
export function updateAdminCode(
  oldCode: string,
  newCode: string,
): { success: boolean; error?: string } {
  if (!verifyAdminCode(oldCode)) {
    return { success: false, error: 'Code actuel incorrect.' };
  }

  if (!new RegExp(`^\\d{${ADMIN_CODE_LENGTH}}$`).test(newCode)) {
    return { success: false, error: `Le nouveau code doit contenir ${ADMIN_CODE_LENGTH} chiffres.` };
  }

  try {
    window.localStorage.setItem(CODE_KEY, hashAdminCode(newCode));
  } catch {
    return { success: false, error: 'Enregistrement impossible.' };
  }

  return { success: true };
}

/** L'admin est-il authentifié pour cette session navigateur ? */
export function isAdminAuthenticated(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Active / supprime la session admin (sessionStorage). */
export function setAdminAuthenticated(value: boolean): void {
  try {
    if (value) {
      window.sessionStorage.setItem(SESSION_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore
  }
}
