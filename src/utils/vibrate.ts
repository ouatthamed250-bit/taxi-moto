/**
 * Vibration du téléphone — utilitaire CENTRALISÉ et SÉCURISÉ.
 *
 * ⚠️ Chrome n'autorise `navigator.vibrate()` qu'après une INTERACTION de
 * l'utilisateur avec la page (« sticky activation »). Avant le premier geste,
 * l'appel est ignoré et la console affiche :
 *
 *   [Intervention] Blocked call to navigator.vibrate because user hasn't
 *   tapped on the frame yet
 *
 * Ce message est émis par le navigateur : il ne peut PAS être intercepté par un
 * `try/catch`. Le seul vrai correctif est de NE PAS appeler l'API avant le
 * premier geste — c'est le rôle du verrou `gesturePrimed` ci-dessous, armé par
 * `primeVibrationOnFirstGesture()` (installé au démarrage de l'application) ou
 * explicitement par `primeVibration()` depuis un gestionnaire de clic.
 *
 * Garanties :
 *   • ne vibre QUE sur un appareil mobile (la vibration n'y a de sens) ;
 *   • ne vibre qu'APRÈS le premier geste utilisateur → plus d'« Intervention » ;
 *   • n'échoue JAMAIS : la vibration reste un BONUS, aucune fonctionnalité
 *     ne doit en dépendre.
 */

/** Le premier geste utilisateur a-t-il eu lieu (autorisation du navigateur) ? */
let gesturePrimed = false;

/**
 * L'appareil est-il mobile ?
 * Test sur l'user-agent, complété par le suivi tactile : iPadOS se déclare
 * « Macintosh » (mode bureau) et serait sinon exclu à tort.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent ?? '')) return true;

  return typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
}

/** L'API de vibration est-elle réellement utilisable sur CET appareil ? */
export function isVibrationSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function' &&
    isMobileDevice()
  );
}

/** Les vibrations sont-elles autorisées (premier geste effectué) ? */
export function isVibrationPrimed(): boolean {
  return gesturePrimed;
}

/**
 * ARMEMENT manuel : à appeler depuis un gestionnaire de clic (le geste en cours
 * suffit au navigateur). Autorise toutes les vibrations suivantes de la session.
 */
export function primeVibration(): void {
  gesturePrimed = true;
}

/**
 * Armement AUTOMATIQUE au premier geste de l'utilisateur (clic, toucher,
 * clavier). Idempotent : les écouteurs se retirent après le premier geste.
 */
export function primeVibrationOnFirstGesture(): void {
  if (typeof window === 'undefined') return;

  const arm = () => {
    primeVibration();
    window.removeEventListener('pointerdown', arm, true);
    window.removeEventListener('touchstart', arm, true);
    window.removeEventListener('keydown', arm, true);
  };

  window.addEventListener('pointerdown', arm, { capture: true, passive: true });
  window.addEventListener('touchstart', arm, { capture: true, passive: true });
  window.addEventListener('keydown', arm, { capture: true });
}

/**
 * Vibre selon un motif : durée simple (`300`) ou motif alterné
 * `[vibration, pause, vibration, …]` en millisecondes.
 *
 * ⚠️ Sans effet (silencieux, jamais bloquant) si l'API est absente, si
 * l'appareil n'est pas mobile, ou si l'utilisateur n'a pas encore touché la page.
 */
export function vibrate(pattern: number | number[]): void {
  if (!gesturePrimed || !isVibrationSupported()) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration refusée par le navigateur (permission, batterie faible…) :
    // on ignore, aucune fonctionnalité ne doit en souffrir.
  }
}

/** Coupe toute vibration en cours (fin de sonnerie, refus, hors ligne…). */
export function stopVibration(): void {
  if (!isVibrationSupported()) return;

  try {
    navigator.vibrate(0);
  } catch {
    // on ignore
  }
}
