/**
 * Persistance locale des paramètres applicatifs (localStorage).
 * Clé : 'taxi-moto:app-settings'.
 */
import type { AppSettings } from '../types';

const SETTINGS_KEY = 'taxi-moto:app-settings';

/** Valeurs par défaut des paramètres. */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  passengerRegistrationEnabled: true,
  driverRegistrationEnabled: true,
  orderingEnabled: true,
  mobileMoneyEnabled: true,
  pushNotificationsEnabled: true,
  maintenanceMode: false,
  commissionRate: 0.1,
  depositNumbers: {
    orange: '0749883981',
    wave: '0554233234',
    mtn: '0554233234',
    moov: '',
  },
  minRecharge: 500,
  maxRecharge: 5000,
  lowBalanceThreshold: 200,
};

function cloneDefaults(): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    depositNumbers: { ...DEFAULT_APP_SETTINGS.depositNumbers },
  };
}

/** Lit les paramètres depuis localStorage (fusionnés avec les valeurs par défaut). */
export function readAppSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return cloneDefaults();

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      depositNumbers: {
        ...DEFAULT_APP_SETTINGS.depositNumbers,
        ...(parsed.depositNumbers ?? {}),
      },
    };
  } catch {
    return cloneDefaults();
  }
}

/** Écrit les paramètres dans localStorage. */
export function writeAppSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Quota dépassé / navigation privée : on ignore.
  }
}