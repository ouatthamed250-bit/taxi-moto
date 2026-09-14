/**
 * Sonnerie LONGUE « nouvelle course » — réservée au CONDUCTEUR.
 *
 * Différences avec le bip court de `notification.ts` (conservé pour les autres
 * notifications : message reçu, confirmation…) :
 *   • motif INSISTANT « 3 bips aigus + pause » répété en boucle ;
 *   • durée garantie ≥ 20 s (jusqu'à 30 s, la durée de vie d'une demande) ;
 *   • la totalité de la sonnerie est PRÉ-PROGRAMMÉE sur la Web Audio API :
 *     elle continue donc même si l'utilisateur change d'onglet (les timers JS y
 *     sont bridés, la sortie audio ne l'est pas) ;
 *   • vibration répétée sur les téléphones Android compatibles ;
 *   • `stopRingtone()` coupe INSTANTANÉMENT (acceptation, refus, expiration).
 */
import { getAudioContext, unlockAudio } from './notification';

/** Durée d'un motif « 3 bips + pause » (ms). */
const MOTIF_MS = 2_000;

/** Durée maximale : au-delà, la demande est de toute façon expirée. */
const RINGTONE_DURATION_MS = 30_000;

/** Nombre de motifs programmés d'avance (couvre les 30 s). */
const MOTIFS = Math.ceil(RINGTONE_DURATION_MS / MOTIF_MS);

/**
 * Durée MINIMALE garantie sans réponse du conducteur : le motif est répété
 * jusqu'à 30 s, donc la sonnerie dépasse toujours ces 20 secondes.
 */
export const RINGTONE_MIN_MS = 20_000;

/** Volume global de la sonnerie (fort mais non douloureux). */
const MASTER_GAIN = 0.85;

/**
 * Vibration répétée : 3 salves franches puis un temps de respiration, pour un
 * rendu « sonnerie d'appel » plutôt qu'un simple buzz.
 */
const VIBRATION_PATTERN = [450, 150, 450, 150, 600, 700];

/** Durée d'un cycle de vibration (permet de le relancer en boucle). */
const VIBRATION_LOOP_MS = VIBRATION_PATTERN.reduce((total, part) => total + part, 0);

/** Oscillateurs actuellement programmés (à couper lors d'un arrêt). */
let activeOscillators: OscillatorNode[] = [];
/** Gain maître de la sonnerie en cours. */
let masterGain: GainNode | null = null;
/** Relance périodique de la vibration. */
let vibrationTimer: number | null = null;
/** Garde-fou de durée (coupe automatique à 30 s). */
let durationTimer: number | null = null;
/** Horodatage du début (0 = sonnerie inactive). */
let startedAt = 0;

/** true = la sonnerie tourne actuellement. */
export function isRingtoneActive(): boolean {
  return startedAt > 0;
}

/** Millisecondes écoulées depuis le début de la sonnerie (0 si inactive). */
export function ringtoneElapsedMs(): number {
  return startedAt > 0 ? Date.now() - startedAt : 0;
}

/**
 * L'audio est-il audible ?
 *
 * ⚠️ Les navigateurs mobiles créent l'`AudioContext` en état `suspended` tant
 * qu'aucun geste utilisateur n'a eu lieu : dans ce cas le conducteur n'entend
 * RIEN et l'UI doit l'inviter à activer le son.
 */
export function isAudioUnlocked(): boolean {
  const context = getAudioContext();
  return context ? context.state === 'running' : false;
}

/** Vibre selon un motif (silencieux si l'API n'est pas disponible). */
function vibrate(pattern: number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // vibration indisponible : on ignore
  }
}

function startVibration(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

  vibrate(VIBRATION_PATTERN);
  vibrationTimer = window.setInterval(() => vibrate(VIBRATION_PATTERN), VIBRATION_LOOP_MS);
}

function stopVibration(): void {
  if (vibrationTimer !== null) {
    window.clearInterval(vibrationTimer);
    vibrationTimer = null;
  }

  try {
    navigator.vibrate?.(0);
  } catch {
    // vibration indisponible : on ignore
  }
}

/**
 * Joue un bip STRIDENT (deux oscillateurs simultanés : fondamentale carrée +
 * harmonique, pour percer le bruit d'une rue).
 */
function beep(
  context: AudioContext,
  output: AudioNode,
  at: number,
  frequency: number,
  duration: number,
  volume: number,
): void {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.015);
  gain.gain.setValueAtTime(volume, at + Math.max(0.02, duration - 0.04));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  gain.connect(output);

  const fundamental = context.createOscillator();
  fundamental.type = 'square';
  fundamental.frequency.value = frequency;
  fundamental.connect(gain);

  const harmonic = context.createOscillator();
  harmonic.type = 'sawtooth';
  harmonic.frequency.value = frequency * 1.5;
  const harmonicGain = context.createGain();
  harmonicGain.gain.value = 0.35;
  harmonic.connect(harmonicGain);
  harmonicGain.connect(gain);

  fundamental.start(at);
  fundamental.stop(at + duration);
  harmonic.start(at);
  harmonic.stop(at + duration);

  activeOscillators.push(fundamental, harmonic);
}

/**
 * Démarre la sonnerie longue (nouvelle demande de course conducteur).
 * Sans effet si elle tourne déjà. La vibration démarre même si la Web Audio
 * API n'est pas disponible.
 */
export function startRingtone(): void {
  if (isRingtoneActive()) return;

  // Obligatoire sur mobile : à défaut d'un geste antérieur, le son restera muet.
  unlockAudio();

  startedAt = Date.now();
  startVibration();

  const context = getAudioContext();

  if (context) {
    if (context.state === 'suspended') void context.resume();

    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);
    masterGain = master;

    const now = context.currentTime + 0.05;

    /*
     * Pré-programmation de TOUS les motifs : l'audio reste joué même quand
     * l'onglet passe en arrière-plan (les `setInterval` y sont bridés, pas la
     * sortie audio).
     */
    for (let motif = 0; motif < MOTIFS; motif += 1) {
      const base = now + (motif * MOTIF_MS) / 1000;
      beep(context, master, base, 1046, 0.18, 0.3);
      beep(context, master, base + 0.24, 1318, 0.18, 0.3);
      beep(context, master, base + 0.48, 1568, 0.26, 0.32);
    }
  }

  // Garde-fou : jamais plus longtemps qu'une demande en attente.
  durationTimer = window.setTimeout(() => stopRingtone(), RINGTONE_DURATION_MS);
}

/**
 * Arrête IMMÉDIATEMENT la sonnerie et la vibration.
 * Appelé à l'acceptation, au refus, à l'expiration (30 s) ou au passage hors ligne.
 */
export function stopRingtone(): void {
  startedAt = 0;

  if (durationTimer !== null) {
    window.clearTimeout(durationTimer);
    durationTimer = null;
  }

  stopVibration();

  for (const oscillator of activeOscillators) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch {
      // déjà arrêté : on ignore
    }
  }
  activeOscillators = [];

  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {
      // déjà déconnecté : on ignore
    }
    masterGain = null;
  }
}
