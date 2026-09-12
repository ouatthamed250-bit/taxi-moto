/**
 * Contacts téléphoniques — liens natifs `tel:` / `sms:`.
 *
 * Les numéros proviennent UNIQUEMENT des comptes réels enregistrés
 * (`services/authLocal.ts` → localStorage). Aucun numéro fictif :
 * si le numéro est introuvable, les boutons d'appel ne sont pas affichés.
 *
 * ⚠️ Les liens `tel:` / `sms:` s'ouvrent dans l'application Téléphone /
 * Messages du téléphone. Sur desktop, le navigateur peut ne rien faire.
 */
import { listDrivers, listPassengers } from './authLocal';

/** Nettoie un numéro pour un lien natif (chiffres + « + » éventuel). */
export function toDialNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/** Lien d'appel natif (`tel:`). */
export function telHref(phone: string): string {
  return `tel:${toDialNumber(phone)}`;
}

/** Lien SMS natif (`sms:`). */
export function smsHref(phone: string): string {
  return `sms:${toDialNumber(phone)}`;
}

/** Lance l'appel (application Téléphone du mobile). */
export function callPhone(phone: string): void {
  const number = toDialNumber(phone);
  if (!number) return;
  window.location.href = `tel:${number}`;
}

/** Ouvre l'application Messages (SMS) avec ce numéro. */
export function messagePhone(phone: string): void {
  const number = toDialNumber(phone);
  if (!number) return;
  window.location.href = `sms:${number}`;
}

interface ContactHint {
  id?: string;
  name?: string;
  phone?: string;
}

/**
 * Numéro réel d'un conducteur.
 * 1. numéro déjà porté par le profil (offre/contexte),
 * 2. sinon recherche dans les conducteurs inscrits (par id puis par nom).
 */
export function resolveDriverPhone(driver: ContactHint): string {
  if (driver.phone) return driver.phone;

  const drivers = listDrivers();
  const byId = driver.id ? drivers.find((user) => user.id === driver.id) : undefined;
  if (byId?.phone) return byId.phone;

  const byName = driver.name ? drivers.find((user) => user.name === driver.name) : undefined;
  return byName?.phone ?? '';
}

/**
 * Numéro réel d'un client.
 * 1. numéro déjà porté par la demande,
 * 2. sinon recherche dans les clients inscrits (par id puis par nom).
 */
export function resolvePassengerPhone(passenger: ContactHint): string {
  if (passenger.phone) return passenger.phone;

  const passengers = listPassengers();
  const byId = passenger.id
    ? passengers.find((user) => user.id === passenger.id)
    : undefined;
  if (byId?.phone) return byId.phone;

  const byName = passenger.name
    ? passengers.find((user) => user.name === passenger.name)
    : undefined;
  return byName?.phone ?? '';
}
