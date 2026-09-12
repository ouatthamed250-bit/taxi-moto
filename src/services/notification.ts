/**
 * Alertes sonores et vibrations — aucun fichier audio requis (WebAudio).
 *
 * ⚠️ Sur mobile, l'audio ne peut démarrer qu'après une action de l'utilisateur :
 * `unlockAudio()` doit être appelé depuis un clic (ex. bouton « En ligne » du
 * conducteur, bouton « Commander » du client).
 */

interface LegacyWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const Ctor =
      window.AudioContext ?? (window as LegacyWindow).webkitAudioContext;
    if (!Ctor) return null;

    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }

  return audioContext;
}

/** Débloque l'audio après un geste utilisateur (obligatoire sur iOS/Android). */
export function unlockAudio(): void {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    void context.resume();
  }
}

/** Joue un bip (fréquence Hz, durée en secondes, volume 0–1). */
function beep(frequency: number, duration: number, volume: number): void {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Son d'alerte FORT pour une nouvelle demande de course :
 * deux bips aigus + vibration du téléphone.
 */
export function playAlertSound(): void {
  unlockAudio();

  beep(880, 0.22, 0.5);
  window.setTimeout(() => beep(1320, 0.22, 0.5), 260);
  window.setTimeout(() => beep(880, 0.3, 0.5), 560);

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate?.([400, 150, 400]);
    } catch {
      // vibration indisponible : on ignore
    }
  }
}

/** Petit clic de confirmation (message envoyé, offre acceptée…). */
export function playSuccessSound(): void {
  unlockAudio();
  beep(1180, 0.12, 0.28);
}
