import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Download, PlusSquare, Share, X } from 'lucide-react';
import './InstallPWA.css';

/** Durée de mémorisation après « Plus tard » : 7 jours. */
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const DISMISS_KEY = 'taxi-moto:install-dismissed-until';

/**
 * Écrans sur lesquels la bannière d'installation peut apparaître.
 * ⚠️ Splash (« / ») est volontairement exclu : écran d'entrée temporaire.
 */
const ALLOWED_ROUTES = ['/welcome', '/login', '/passenger'];

/** Écrans dotés de la BottomNav → la bannière doit s'afficher AU-DESSUS. */
const NAV_ROUTES = ['/passenger', '/driver'];

/**
 * Événement non standard de Chrome/Android, absent de la lib DOM :
 * on le redéclare localement.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** L'app tourne-t-elle déjà en mode « installé » (standalone) ? */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

/** Détection iOS / iPadOS (qui n'émet pas de « beforeinstallprompt »). */
function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOS = ua.includes('Macintosh') && 'ontouchend' in document;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

/** L'utilisateur a-t-il reporté l'installation il y a moins de 7 jours ? */
function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function rememberDismiss(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {
    // localStorage indisponible (navigation privée) : on ignore silencieusement.
  }
}

/**
 * Bannière d'installation PWA.
 * - Android/Chrome : bouton « Installer » qui déclenche le prompt natif.
 * - iOS/Safari : instructions manuelles (Partager → sur l'écran d'accueil).
 * - Ne s'affiche jamais si l'app est déjà installée ni sur les écrans non listés.
 */
export const InstallPWA = () => {
  const { pathname } = useLocation();

  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(detectIOS);
  const [installed, setInstalled] = useState(detectStandalone);
  const [dismissed, setDismissed] = useState(wasDismissedRecently);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Empêche le mini-bandage par défaut de Chrome : on gère l'UI nous-même.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onAllowedRoute = ALLOWED_ROUTES.includes(pathname);
  const visible =
    onAllowedRoute &&
    !installed &&
    !dismissed &&
    (promptEvent !== null || isIOS);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    if (outcome === 'accepted') setInstalled(true);
  };

  const handleLater = () => {
    rememberDismiss();
    setDismissed(true);
  };

  if (!visible) return null;

  const withNav = NAV_ROUTES.includes(pathname);

  return (
    <aside
      className={`install-pwa${withNav ? ' install-pwa--with-nav' : ''}`}
      role="dialog"
      aria-label="Installer l'application Taxi-Moto"
      aria-live="polite"
    >
      <div className="install-pwa-card">
        <button
          type="button"
          className="install-pwa-close"
          onClick={handleLater}
          aria-label="Fermer"
        >
          <X size={15} />
        </button>

        <div className="install-pwa-head">
          <span className="install-pwa-logo">
            <img src="/images/logo.png" alt="" />
          </span>
          <div className="install-pwa-title">
            <strong>Installer Taxi-Moto</strong>
            <span>sur votre écran d'accueil</span>
          </div>
        </div>

        {isIOS ? (
          <div className="install-pwa-ios">
            <p className="install-pwa-ios-lead">Pour installer Taxi-Moto sur iPhone :</p>
            <ol className="install-pwa-steps">
              <li>
                <span className="install-pwa-step-icon">
                  <Share size={14} />
                </span>
                Appuyez sur l'icône Partager (carré avec flèche)
              </li>
              <li>
                <span className="install-pwa-step-icon">
                  <PlusSquare size={14} />
                </span>
                Sélectionnez « Sur l'écran d'accueil »
              </li>
              <li>
                <span className="install-pwa-step-icon">
                  <Check size={14} />
                </span>
                Appuyez sur « Ajouter »
              </li>
            </ol>
          </div>
        ) : (
          <p className="install-pwa-text">
            Ajoutez Taxi-Moto à votre écran d'accueil pour un accès en un clic.
          </p>
        )}

        <div className="install-pwa-actions">
          {isIOS ? (
            <button
              type="button"
              className="install-pwa-btn install-pwa-btn--primary"
              onClick={handleLater}
            >
              J'ai compris
            </button>
          ) : (
            <>
              <button
                type="button"
                className="install-pwa-btn install-pwa-btn--primary"
                onClick={handleInstall}
              >
                <Download size={16} />
                Installer
              </button>
              <button
                type="button"
                className="install-pwa-btn install-pwa-btn--ghost"
                onClick={handleLater}
              >
                Plus tard
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
