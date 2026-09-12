/**
 * Authentification locale (localStorage) — à migrer vers Firebase plus tard.
 *
 * ⚠️ Le mot de passe est stocké EN CLAIR pour l'instant (prototype local).
 *
 * Clés utilisées :
 *   - 'taxi-moto:users'        → liste des comptes inscrits
 *   - 'taxi-moto:current-user' → compte actuellement connecté
 */
import type { AuthResult, DriverRegisterInput, PassengerRegisterInput, User } from '../types';

const USERS_KEY = 'taxi-moto:users';
const CURRENT_KEY = 'taxi-moto:current-user';

/** Longueur minimale du mot de passe. */
export const MIN_PASSWORD_LENGTH = 6;
/** Taille maximale d'une photo (base64) : 5 Mo. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Plaque d'immatriculation valide : AA-123-BC. */
const PLATE_RE = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;

/** Questions de sécurité proposées à l'inscription. */
export const SECURITY_QUESTIONS = [
  'Quel est le nom de votre premier animal ?',
  'Quel est le nom de votre école primaire ?',
  'Quel est le prénom de votre mère ?',
  'Quelle est votre ville de naissance ?',
  'Quel est votre plat préféré ?',
] as const;

/** Longueur minimale de la réponse de sécurité. */
const MIN_ANSWER_LENGTH = 2;

/**
 * Hache une réponse de sécurité. La réponse est normalisée (minuscules,
 * sans espaces superflus) avant hachage → comparaison insensible à la casse.
 */
export function hashSecurityAnswer(answer: string): string {
  const normalized = answer.trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) | 0;
  }
  return `h${(hash >>> 0).toString(36)}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function readUsers(): User[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    // Quota dépassé / navigation privée : on ignore silencieusement.
  }
}

function setCurrentUser(user: User): void {
  try {
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

function makeId(): string {
  return `U-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

/** Valide les champs communs (nom, téléphone, mot de passe, unicité du numéro). */
function validateCommon(input: PassengerRegisterInput, users: User[]): string | null {
  if (input.name.trim().length < 3) return 'Entrez votre nom complet.';

  const phone = normalizePhone(input.phone);
  if (phone.length < 8 || phone.length > 15) return 'Numéro de téléphone invalide.';

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }

  if (users.some((user) => normalizePhone(user.phone) === phone)) {
    return 'Ce numéro est déjà utilisé. Connectez-vous plutôt.';
  }

  if (!input.securityQuestion) {
    return 'Choisissez une question de sécurité.';
  }

  if (input.securityAnswer.trim().length < MIN_ANSWER_LENGTH) {
    return `Réponse de sécurité trop courte (${MIN_ANSWER_LENGTH} caractères minimum).`;
  }

  return null;
}

/** Inscription d'un passager. Connecte automatiquement le compte créé. */
export function registerPassenger(input: PassengerRegisterInput): AuthResult {
  const users = readUsers();
  const error = validateCommon(input, users);
  if (error) return { success: false, error };

  const user: User = {
    id: makeId(),
    role: 'passenger',
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
    password: input.password,
    securityQuestion: input.securityQuestion,
    securityAnswer: hashSecurityAnswer(input.securityAnswer),
    createdAt: Date.now(),
  };

  writeUsers([...users, user]);
  setCurrentUser(user);
  return { success: true, user };
}

/** Inscription d'un conducteur. Connecte automatiquement le compte créé. */
export function registerDriver(input: DriverRegisterInput): AuthResult {
  const users = readUsers();
  const error = validateCommon(input, users);
  if (error) return { success: false, error };

  if (!PLATE_RE.test(input.plate.trim().toUpperCase())) {
    return { success: false, error: 'Plaque invalide (format AA-123-BC).' };
  }
  if (!input.driverPhoto) {
    return { success: false, error: 'Ajoutez votre photo de conducteur.' };
  }
  if (!input.vehiclePhoto) {
    return { success: false, error: 'Ajoutez la photo de votre véhicule.' };
  }

  const user: User = {
    id: makeId(),
    role: 'driver',
    name: input.name.trim(),
    phone: normalizePhone(input.phone),
    password: input.password,
    vehicle: input.vehicle,
    plate: input.plate.trim().toUpperCase(),
    driverPhoto: input.driverPhoto,
    vehiclePhoto: input.vehiclePhoto,
    securityQuestion: input.securityQuestion,
    securityAnswer: hashSecurityAnswer(input.securityAnswer),
    createdAt: Date.now(),
  };

  writeUsers([...users, user]);
  setCurrentUser(user);
  return { success: true, user };
}

/** Connexion par numéro + mot de passe. */
export function login(phone: string, password: string): AuthResult {
  const normalized = normalizePhone(phone);
  const users = readUsers();
  const user = users.find((item) => normalizePhone(item.phone) === normalized);

  if (!user || user.password !== password) {
    return { success: false, error: 'Numéro ou mot de passe incorrect.' };
  }

  setCurrentUser(user);
  return { success: true, user };
}

/** Retourne le compte actuellement connecté (ou null). */
export function getCurrentUser(): User | null {
  try {
    const raw = window.localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Déconnecte l'utilisateur (supprime la session courante). */
export function logout(): void {
  try {
    window.localStorage.removeItem(CURRENT_KEY);
  } catch {
    // ignore
  }
}

/** Liste tous les comptes inscrits (clients + conducteurs). */
export function listUsers(): User[] {
  return readUsers();
}

/** Liste les conducteurs inscrits (role = 'driver'). */
export function listDrivers(): User[] {
  return readUsers().filter((user) => user.role === 'driver');
}

/** Liste les clients inscrits (role = 'passenger'). */
export function listPassengers(): User[] {
  return readUsers().filter((user) => user.role === 'passenger');
}

/** Récupère un conducteur par son identifiant. */
export function getDriverById(id: string): User | null {
  return readUsers().find((user) => user.role === 'driver' && user.id === id) ?? null;
}

/** Bloque ou débloque un compte (par numéro). */
export function setUserBlocked(phone: string, blocked: boolean): void {
  const normalized = normalizePhone(phone);
  const users = readUsers();
  const next = users.map((user) =>
    normalizePhone(user.phone) === normalized ? { ...user, blocked } : user,
  );
  writeUsers(next);

  const current = getCurrentUser();
  if (current && normalizePhone(current.phone) === normalized) {
    setCurrentUser({ ...current, blocked });
  }
}

/** Retourne la question de sécurité liée à un numéro (null si compte inconnu). */
export function getSecurityQuestion(phone: string): string | null {
  const normalized = normalizePhone(phone);
  const user = readUsers().find((item) => normalizePhone(item.phone) === normalized);
  return user?.securityQuestion ?? null;
}

/**
 * Vérifie la réponse de sécurité d'un numéro (étape 2 du mot de passe oublié).
 * La réponse est normalisée (minuscules, sans espaces superflus) avant hachage.
 */
export function verifySecurityAnswer(phone: string, answer: string): boolean {
  const normalized = normalizePhone(phone);
  const user = readUsers().find((item) => normalizePhone(item.phone) === normalized);
  if (!user?.securityAnswer) return false;
  return hashSecurityAnswer(answer) === user.securityAnswer;
}

/**
 * Réinitialise le mot de passe après vérification de la réponse de sécurité.
 * La réponse est normalisée (minuscules, sans espaces superflus) avant hachage.
 */
export function resetPassword(phone: string, answer: string, newPassword: string): AuthResult {
  const normalized = normalizePhone(phone);
  const users = readUsers();
  const index = users.findIndex((item) => normalizePhone(item.phone) === normalized);

  if (index === -1) {
    return { success: false, error: 'Aucun compte trouvé avec ce numéro.' };
  }

  const user = users[index];
  if (!user.securityAnswer || hashSecurityAnswer(answer) !== user.securityAnswer) {
    return { success: false, error: 'Réponse incorrecte. Réessayez.' };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }

  const updated: User = { ...user, password: newPassword };
  const nextUsers = [...users];
  nextUsers[index] = updated;
  writeUsers(nextUsers);

  // Met à jour la session courante si c'est le même compte.
  const current = getCurrentUser();
  if (current && normalizePhone(current.phone) === normalized) {
    setCurrentUser(updated);
  }

  return { success: true, user: updated };
}