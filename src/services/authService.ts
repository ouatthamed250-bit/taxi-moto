/**
 * Authentification applicative — couche UNIQUE utilisée par l'UI.
 *
 * Deux modes, choisis automatiquement :
 *   • **Firebase** (si `.env` est rempli) : la session est ouverte avec une
 *     connexion ANONYME (1 appareil = 1 uid) et le compte est persisté dans
 *     Firestore `users/{uid}` → visible depuis n'importe quel appareil.
 *   • **localStorage** (repli, développement hors-ligne) : comportement
 *     historique, aucune donnée n'est partagée.
 *
 * ⚠️ Le mot de passe est encore stocké dans le document Firestore (prototype).
 *    La migration vers Firebase Auth par téléphone (SMS) se fera plus tard :
 *    il suffira de remplacer les vérifications `user.password === …` par
 *    `signInWithPhoneNumber` / `linkWithCredential`.
 */
import type {
  AuthResult,
  DriverRegisterInput,
  PassengerRegisterInput,
  User,
} from '../types';
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
  onAuthChange,
  signOutFirebase,
} from './firebase';
import { createUser, findUserByPhone, getUser, updateUser } from './firestore';
import { normalizePhone, phoneVariants } from './phone';
import * as local from './authLocal';

/* ---------------- Constantes (identiques dans les deux modes) ---------------- */
export {
  MAX_PHOTO_BYTES,
  MIN_PASSWORD_LENGTH,
  SECURITY_QUESTIONS,
  hashSecurityAnswer,
} from './authLocal';

/* ------- Lectures SYNCHRONES (cache local alimenté par Firestore) ------- */
export {
  cacheCloudUser,
  getDriverById,
  listDrivers,
  listPassengers,
  listUsers,
  replaceUserCache,
  setUserBlocked,
  validateDriverInput,
  validatePassengerInput,
} from './authLocal';

/** Firebase est-il actif ? (sinon → mode local localStorage) */
export function isCloudEnabled(): boolean {
  return isFirebaseConfigured;
}

/**
 * Retrouve un compte par téléphone, quel que soit le format saisi
 * (Firestore en priorité, puis cache local).
 */
async function findAccountByPhone(phone: string): Promise<User | null> {
  for (const variant of phoneVariants(phone)) {
    const cloudUser = await findUserByPhone(variant);
    if (cloudUser) return cloudUser;

    const cached = local
      .listUsers()
      .find((item) => normalizePhone(item.phone) === variant);
    if (cached) return cached;
  }

  return null;
}

/** Message d'aide affiché si la session Firebase anonyme est refusée. */
const ANONYMOUS_DISABLED_WARNING = [
  '[firebase] Session anonyme impossible → bascule en mode local (localStorage).',
  'Correctif : Console Firebase → Authentication → Sign-in method → Anonyme → Activer.',
  'Sans cela, aucun compte ne peut être persisté dans Firestore.',
].join(' ');

/**
 * Identifiant Firestore du NOUVEAU compte.
 * Si l'appareil possède déjà un compte (`users/{uid}`), une nouvelle session
 * anonyme est ouverte afin de ne PAS écraser le compte existant (cas d'un
 * client et d'un conducteur créés depuis le même téléphone).
 */
async function resolveAccountId(): Promise<string> {
  const anonymous = await ensureAnonymousUser();
  if (!anonymous) return '';

  const existing = await getUser(anonymous.uid);
  if (!existing) return anonymous.uid;

  await signOutFirebase();
  const fresh = await ensureAnonymousUser();
  return fresh?.uid ?? '';
}

/* ================================ CONNEXION ================================ */

/**
 * Ouvre (ou récupère) la SESSION FIREBASE ANONYME.
 *
 * ⚠️ RÈGLE D'OR : à appeler AVANT toute lecture/écriture Firestore.
 * Les règles de sécurité exigent `request.auth != null` : interroger Firestore
 * avant l'authentification renvoie PERMISSION_DENIED (que l'on interprétait à
 * tort comme « compte introuvable » → « Numéro ou mot de passe incorrect »).
 */
export async function ensureCloudSession(): Promise<boolean> {
  const anonymous = await ensureAnonymousUser();
  return anonymous !== null;
}

/**
 * Connexion par numéro + mot de passe.
 *
 * Ordre IMPOSÉ :
 *   1. authentification anonyme Firebase (session ouverte) ;
 *   2. recherche du compte dans Firestore (désormais autorisée) ;
 *   3. vérification du mot de passe ;
 *   4. retour de l'utilisateur connecté.
 */
export async function login(phone: string, password: string): Promise<AuthResult> {
  if (!isFirebaseConfigured) return local.login(phone, password);

  // 1) AUTHENTIFICATION D'ABORD.
  const sessionReady = await ensureCloudSession();
  if (!sessionReady) {
    // Pas de session Firebase (fournisseur Anonyme désactivé / hors-ligne).
    console.warn(ANONYMOUS_DISABLED_WARNING);

    // Repli local : on tente aussi les variantes d'écriture du numéro.
    for (const variant of phoneVariants(phone)) {
      const attempt = local.login(variant, password);
      if (attempt.success) return attempt;
    }

    return local.login(normalizePhone(phone), password);
  }

  // 2) Recherche du compte — maintenant que la session est ouverte.
  //    (toutes les écritures du numéro sont testées : avec/sans +225, avec/sans 0)
  const user = await findAccountByPhone(phone);

  // 3) Vérification du mot de passe.
  if (!user || user.password !== password) {
    return { success: false, error: 'Numéro ou mot de passe incorrect.' };
  }

  if (user.blocked) {
    return { success: false, error: 'Ce compte est bloqué. Contactez le support.' };
  }

  // 4) Session applicative (cache local alimenté par Firestore).
  local.cacheCloudUser(user);
  return { success: true, user };
}

/** Déconnexion : session locale + session Firebase. */
export async function logout(): Promise<void> {
  local.clearLocalSession();
  await signOutFirebase();
}

/**
 * Restaure la session au démarrage.
 * En mode cloud, le compte Firestore (le plus à jour) remplace le cache local.
 */
export async function restoreSession(): Promise<User | null> {
  const cached = local.getCurrentUser();
  if (!isFirebaseConfigured) return cached;

  const accountId = local.getCloudAccountId() || cached?.id || '';
  if (accountId) {
    const cloud = await getUser(accountId);
    if (cloud) {
      local.cacheCloudUser(cloud);
      return cloud;
    }
  }

  return cached;
}

/**
 * Notifie dès qu'une session Firebase est (re)disponible.
 * On ignore volontairement la déconnexion ici : `logout()` s'en occupe, ce qui
 * évite de fermer la session pendant l'initialisation hors-ligne.
 */
export function onSessionChange(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured) return () => {};

  return onAuthChange((firebaseUser) => {
    if (!firebaseUser) return;

    void restoreSession().then((user) => {
      if (user) callback(user);
    });
  });
}

/** Bloque / débloque un compte sur TOUS les appareils (cache + Firestore). */
export async function blockUserEverywhere(
  phone: string,
  blocked: boolean,
): Promise<void> {
  local.setUserBlocked(phone, blocked);

  if (!isFirebaseConfigured) return;

  // Session Firebase AVANT toute écriture Firestore.
  if (!(await ensureCloudSession())) return;

  const cloud = await findAccountByPhone(phone);
  if (cloud) await updateUser(cloud.id, { blocked });
}

/* ======================== MOT DE PASSE OUBLIÉ ======================== */

/** Question de sécurité liée à un numéro (Firestore si configuré). */
export async function getSecurityQuestion(phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone);

  // Session Firebase AVANT la lecture Firestore.
  if (isFirebaseConfigured && (await ensureCloudSession())) {
    const cloud = await findAccountByPhone(phone);
    if (cloud) return cloud.securityQuestion ?? null;
  }

  return local.getSecurityQuestion(normalized);
}

/** Vérifie la réponse de sécurité (Firestore si configuré). */
export async function verifySecurityAnswer(
  phone: string,
  answer: string,
): Promise<boolean> {
  const normalized = normalizePhone(phone);

  // Session Firebase AVANT la lecture Firestore.
  if (isFirebaseConfigured && (await ensureCloudSession())) {
    const cloud = await findAccountByPhone(phone);
    if (cloud) {
      if (!cloud.securityAnswer) return false;
      return local.hashSecurityAnswer(answer) === cloud.securityAnswer;
    }
  }

  return local.verifySecurityAnswer(normalized, answer);
}

/** Réinitialise le mot de passe (cache local + Firestore). */
export async function resetPassword(
  phone: string,
  answer: string,
  newPassword: string,
): Promise<AuthResult> {
  const normalized = normalizePhone(phone);

  // Session Firebase AVANT la lecture/écriture Firestore.
  if (isFirebaseConfigured && (await ensureCloudSession())) {
    const cloud = await findAccountByPhone(phone);

    if (cloud) {
      if (
        !cloud.securityAnswer ||
        local.hashSecurityAnswer(answer) !== cloud.securityAnswer
      ) {
        return { success: false, error: 'Réponse incorrecte. Réessayez.' };
      }

      if (newPassword.length < local.MIN_PASSWORD_LENGTH) {
        return {
          success: false,
          error: `Le mot de passe doit contenir au moins ${local.MIN_PASSWORD_LENGTH} caractères.`,
        };
      }

      const updated: User = { ...cloud, password: newPassword };
      await updateUser(cloud.id, { password: newPassword });
      local.cacheCloudUser(updated);
      return { success: true, user: updated };
    }
  }

  return local.resetPassword(normalized, answer, newPassword);
}


/** Inscription d'un client (passager). Connecte automatiquement le compte. */
export async function registerPassenger(
  input: PassengerRegisterInput,
): Promise<AuthResult> {
  if (!isFirebaseConfigured) return local.registerPassenger(input);

  // 1) Validation locale (aucun accès réseau).
  const validationError = local.validatePassengerInput(input);
  if (validationError) return { success: false, error: validationError };

  // 2) SESSION FIREBASE D'ABORD (ouvre/résout l'uid) : sinon Firestore refuse.
  const accountId = await resolveAccountId();
  if (!accountId) {
    // Auth anonyme indisponible : on ne bloque pas l'utilisateur, on reste local.
    console.warn(ANONYMOUS_DISABLED_WARNING);
    return local.registerPassenger(input);
  }

  // 3) Unicité du numéro — lecture Firestore désormais autorisée.
  //    (comparaison multi-format : +225 / 0 / sans zéro)
  const phone = normalizePhone(input.phone);
  const alreadyUsed = (await findAccountByPhone(phone)) !== null;

  if (alreadyUsed) {
    return { success: false, error: 'Ce numéro est déjà utilisé. Connectez-vous plutôt.' };
  }

  const user: User = {
    id: accountId,
    role: 'passenger',
    name: input.name.trim(),
    phone,
    password: input.password,
    securityQuestion: input.securityQuestion,
    securityAnswer: local.hashSecurityAnswer(input.securityAnswer),
    createdAt: Date.now(),
  };

  const stored = await createUser(accountId, user);
  if (!stored.ok) {
    return { success: false, error: stored.error ?? 'Enregistrement Firestore impossible.' };
  }

  local.cacheCloudUser(user);
  return { success: true, user };
}

/** Inscription d'un conducteur. Connecte automatiquement le compte. */
export async function registerDriver(
  input: DriverRegisterInput,
): Promise<AuthResult> {
  if (!isFirebaseConfigured) return local.registerDriver(input);

  // 1) Validation locale (aucun accès réseau).
  const validationError = local.validateDriverInput(input);
  if (validationError) return { success: false, error: validationError };

  // 2) SESSION FIREBASE D'ABORD (ouvre/résout l'uid) : sinon Firestore refuse.
  const accountId = await resolveAccountId();
  if (!accountId) {
    // Auth anonyme indisponible : on ne bloque pas l'utilisateur, on reste local.
    console.warn(ANONYMOUS_DISABLED_WARNING);
    return local.registerDriver(input);
  }

  // 3) Unicité du numéro — lecture Firestore désormais autorisée.
  //    (comparaison multi-format : +225 / 0 / sans zéro)
  const phone = normalizePhone(input.phone);
  const alreadyUsed = (await findAccountByPhone(phone)) !== null;

  if (alreadyUsed) {
    return { success: false, error: 'Ce numéro est déjà utilisé. Connectez-vous plutôt.' };
  }

  const user: User = {
    id: accountId,
    role: 'driver',
    name: input.name.trim(),
    phone,
    password: input.password,
    vehicle: input.vehicle,
    plate: input.plate.trim().toUpperCase(),
    driverPhoto: input.driverPhoto,
    vehiclePhoto: input.vehiclePhoto,
    securityQuestion: input.securityQuestion,
    securityAnswer: local.hashSecurityAnswer(input.securityAnswer),
    createdAt: Date.now(),
  };

  const stored = await createUser(accountId, user);
  if (!stored.ok) {
    return { success: false, error: stored.error ?? 'Enregistrement Firestore impossible.' };
  }

  local.cacheCloudUser(user);
  return { success: true, user };
}

