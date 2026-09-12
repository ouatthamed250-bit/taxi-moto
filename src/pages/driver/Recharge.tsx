import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleCheck,
  ExternalLink,
  ImagePlus,
  Send,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { compressImageFile } from '../../services/imageCompress';
import './Recharge.css';

/** Montants rapides proposés (FCFA). */
const PRESET_AMOUNTS = [500, 1000, 2000, 3000, 5000];
/** Taille maximale du fichier CHOISI, avant compression (Mo). */
const MAX_FILE_MB = 10;
/**
 * Poids maximal de la capture ENVOYÉE à Firestore (Ko).
 * ⚠️ Firestore limite un document à 1 Mio : on vise 500 Ko pour rester large.
 */
const MAX_SHOT_KB = 500;

type OperatorTone = 'orange' | 'wave' | 'mtn' | 'moov';

interface MobileOperator {
  key: string;
  name: string;
  /** Libellé court du bouton (fallback USSD). */
  action: string;
  phone: string;
  tone: OperatorTone;
  available: boolean;
  /** Code USSD complet (lien tel:). */
  ussd: string;
  /** Numéro de dépôt à saisir au menu vocal. */
  depositNumber: string;
  /** Scheme de l'application mobile money ('' = pas d'app). */
  appScheme: string;
  /** Repli web si l'app n'est pas installée. */
  appFallbackUrl: string;
  /** Libellé de l'app pour le bouton « Ouvrir l'application … ». */
  appLabel: string;
  /** Lien web de secours générique. */
  webLink: string;
}

const OPERATORS: MobileOperator[] = [
  {
    key: 'orange',
    name: 'Orange Money',
    action: 'Orange Money',
    phone: '0749883981',
    tone: 'orange',
    available: true,
    ussd: '*144*0749883981#',
    depositNumber: '0749883981',
    appScheme: 'orange-money://',
    appFallbackUrl: 'https://orange.ci',
    appLabel: 'Orange Money',
    webLink: 'https://orange.ci/',
  },
  {
    key: 'wave',
    name: 'Wave',
    action: 'Wave',
    phone: '0554233234',
    tone: 'wave',
    available: true,
    ussd: '*9113#',
    depositNumber: '0554233234',
    appScheme: 'wave://send?phone=0554233234',
    appFallbackUrl: 'https://wave.com',
    appLabel: 'Wave',
    webLink: 'https://wave.com/',
  },
  {
    key: 'mtn',
    name: 'MTN Money',
    action: 'MTN',
    phone: '0554233234',
    tone: 'mtn',
    available: true,
    ussd: '*133*0554233234#',
    depositNumber: '0554233234',
    appScheme: 'mtn-momo://',
    appFallbackUrl: 'https://mtn.ci',
    appLabel: 'MTN MoMo',
    webLink: 'https://mtn.ci/',
  },
  {
    key: 'moov',
    name: 'Moov Money',
    action: 'Moov',
    phone: '—',
    tone: 'moov',
    available: false,
    ussd: '',
    depositNumber: '—',
    appScheme: '',
    appFallbackUrl: '',
    appLabel: 'Moov',
    webLink: '',
  },
];

/** Frais de dépôt mobile money applicables selon le montant (FCFA). */
function getDepositFee(amount: number): number {
  if (amount < 1000) return 50;
  if (amount < 5000) return 75;
  return 100;
}

/**
 * Ouvre le composeur téléphonique avec le code USSD officiel de l'opérateur.
 * Le conducteur suit ensuite le menu vocal pour saisir le numéro, le montant
 * et son code PIN (jamais inclus dans le lien).
 */
function openOperatorLink(operator: MobileOperator): void {
  if (!operator.ussd) return;
  window.location.href = `tel:${operator.ussd}`;
}

/**
 * Tente d'ouvrir l'application mobile money via son scheme. Si l'app n'est pas
 * installée, la page reste visible ~1,2 s → repli sur le site web de l'opérateur.
 */
function openAppScheme(appScheme: string, fallbackUrl: string): void {
  if (!appScheme) return;

  const timer = window.setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.location.href = fallbackUrl;
    }
  }, 1200);

  // Si l'app s'ouvre, l'onglet passe en arrière-plan → on annule le repli.
  window.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') window.clearTimeout(timer);
    },
    { once: true },
  );

  window.location.href = appScheme;
}

/** Ouvre l'application Orange Money (repli : orange.ci). */
function openOrangeApp(operator: MobileOperator): void {
  openAppScheme(operator.appScheme, operator.appFallbackUrl);
}

/** Ouvre l'application Wave (repli : wave.com). */
function openWaveApp(operator: MobileOperator): void {
  openAppScheme(operator.appScheme, operator.appFallbackUrl);
}

/** Ouvre l'application MTN MoMo (repli : mtn.ci). */
function openMtnApp(operator: MobileOperator): void {
  openAppScheme(operator.appScheme, operator.appFallbackUrl);
}

/** Sélectionne l'ouverture d'app selon l'opérateur. */
const APP_OPENERS: Partial<Record<string, (operator: MobileOperator) => void>> = {
  orange: openOrangeApp,
  wave: openWaveApp,
  mtn: openMtnApp,
};

/** Ouvre l'app mobile money de l'opérateur choisi (si disponible). */
function openOperatorApp(operator: MobileOperator): void {
  const openApp = APP_OPENERS[operator.key];
  if (openApp) openApp(operator);
}

export default function DriverRecharge() {
  const navigate = useNavigate();
  const { userName, phone, accountId, driverBalance, submitRechargeRequest, appSettings } =
    useApp();

  const minRecharge = appSettings.minRecharge;
  const maxRecharge = appSettings.maxRecharge;

  /* Numéros de dépôt pilotés par les paramètres admin (sinon valeurs par défaut). */
  const depositNumbers: Record<string, string> = appSettings.depositNumbers;
  const operators = OPERATORS.map((item) => {
    const number = depositNumbers[item.key];
    return {
      ...item,
      phone: number || item.phone,
      depositNumber: number || item.depositNumber,
    };
  });

  const [preset, setPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [operatorKey, setOperatorKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [screenshot, setScreenshot] = useState('');
  /** Poids de la capture compressée (octets) — affiché et contrôlé. */
  const [shotBytes, setShotBytes] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [fileError, setFileError] = useState('');
  const [sent, setSent] = useState(false);

  const operator = operators.find((item) => item.key === operatorKey) ?? null;
  const amount = customAmount.trim() !== '' ? Number(customAmount) : preset;
  const amountValid =
    amount !== null && Number.isFinite(amount) && amount >= minRecharge && amount <= maxRecharge;
  const canContinue = amountValid && operator?.available === true;

  const depositFee = getDepositFee(amount ?? 0);
  const totalToSend = (amount ?? 0) + depositFee;
  const ussdCode = operator?.ussd ?? '';

  const choosePreset = (value: number) => {
    setPreset(value);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value.replace(/[^0-9]/g, ''));
    setPreset(null);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Veuillez choisir une image (PNG ou JPG).');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`Image trop lourde (maximum ${MAX_FILE_MB} Mo).`);
      return;
    }

    setFileError('');
    setCompressing(true);

    try {
      /*
       * COMPRESSION OBLIGATOIRE : la capture est stockée en base64 dans
       * Firestore (limite 1 Mio par document). On la redimensionne (800 px)
       * et on baisse la qualité jusqu'à passer sous 500 Ko.
       */
      const compressed = await compressImageFile(file, {
        maxWidth: 800,
        maxBytes: MAX_SHOT_KB * 1024,
        quality: 0.6,
      });

      setScreenshot(compressed.dataUrl);
      setShotBytes(compressed.bytes);
    } catch (error) {
      setScreenshot('');
      setShotBytes(0);
      setFileError(
        error instanceof Error
          ? error.message
          : 'Compression de l’image impossible. Réessayez avec une autre capture.',
      );
    } finally {
      setCompressing(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setPaid(false);
    setScreenshot('');
    setShotBytes(0);
    setFileError('');
  };

  const handleSubmit = () => {
    if (!operator || !amountValid || !screenshot) return;

    if (shotBytes > MAX_SHOT_KB * 1024) {
      setFileError(
        `Capture trop lourde (${Math.round(shotBytes / 1024)} Ko). Maximum ${MAX_SHOT_KB} Ko.`,
      );
      return;
    }

    submitRechargeRequest({
      /*
       * `accountId` = docId Firestore `users/{id}` → MÊME clé que celle utilisée
       * par l'admin (validation, cadeaux). Repli sur le téléphone en mode local.
       */
      driverId: accountId || phone || 'driver-local',
      driverName: userName || 'Conducteur',
      amount: amount ?? 0,
      method: operator.name,
      phone: operator.phone,
      screenshot,
    });

    setSent(true);
    window.setTimeout(() => navigate('/driver'), 1800);
  };

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-recharge-page">

        {/* Décoration de fond */}
        <div className="driver-recharge-orb driver-recharge-orb--orange" />
        <div className="driver-recharge-orb driver-recharge-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="driver-recharge-topbar">
          <button
            type="button"
            className="driver-recharge-back"
            aria-label="Retour"
            onClick={() => navigate('/driver')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="driver-recharge-brand">
            <div className="driver-recharge-logo" aria-hidden="true">
              <div className="driver-recharge-logo-pin">
                <Wallet size={15} strokeWidth={2.6} />
              </div>
            </div>
            <div className="driver-recharge-brand-text">
              <span className="driver-recharge-eyebrow">Taxi Moto</span>
              <strong>Recharger mon compte</strong>
            </div>
          </div>
        </header>

        {/* ===== SOLDE ACTUEL ===== */}
        <section className="driver-recharge-balance">
          <div className="driver-recharge-balance-head">
            <span className="driver-recharge-balance-icon">
              <Wallet size={16} />
            </span>
            <span className="driver-recharge-balance-label">Solde actuel</span>
          </div>

          <strong className="driver-recharge-balance-amount">{fcfa(driverBalance)}</strong>
          <span className="driver-recharge-balance-hint">
            Ajoutez du crédit à votre solde Taxi-Moto
          </span>
        </section>

        {/* ===== MONTANT ===== */}
        <section className="driver-recharge-block">
          <h2 className="driver-recharge-section-title">Choisissez le montant</h2>

          <div className="driver-recharge-amounts">
            {PRESET_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`driver-recharge-amount${
                  preset === value ? ' driver-recharge-amount--active' : ''
                }`}
                onClick={() => choosePreset(value)}
              >
                {value.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>

          <label className="driver-recharge-custom">
            <span className="driver-recharge-custom-label">Autre montant</span>
            <div className="driver-recharge-custom-field">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex : 7500"
                value={customAmount}
                onChange={(event) => handleCustomAmount(event.target.value)}
              />
              <span className="driver-recharge-custom-suffix">FCFA</span>
            </div>
            <small className="driver-recharge-custom-hint">
              Minimum {fcfa(minRecharge)} · Maximum {fcfa(maxRecharge)}
            </small>
          </label>
        </section>

        {/* ===== MÉTHODE ===== */}
        <section className="driver-recharge-block">
          <h2 className="driver-recharge-section-title">Choisissez la méthode</h2>

          <div className="driver-recharge-operators">
            {operators.map((item) => {
              const active = operatorKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!item.available}
                  className={`driver-recharge-op driver-recharge-op--${item.tone}${
                    active ? ' driver-recharge-op--active' : ''
                  }${item.available ? '' : ' driver-recharge-op--disabled'}`}
                  onClick={() => item.available && setOperatorKey(item.key)}
                >
                  <span className="driver-recharge-op-mark" aria-hidden="true">
                    {item.name.charAt(0)}
                  </span>

                  <span className="driver-recharge-op-info">
                    <strong>{item.name}</strong>
                    <small>{item.available ? item.phone : 'Numéro à venir'}</small>
                  </span>

                  {item.available ? (
                    <span className="driver-recharge-op-tag">
                      {active ? <Check size={13} /> : 'Disponible'}
                    </span>
                  ) : (
                    <span className="driver-recharge-op-tag driver-recharge-op-tag--off">
                      Bientôt
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== CTA ===== */}
        <button
          type="button"
          className="driver-recharge-continue"
          disabled={!canContinue}
          onClick={() => setModalOpen(true)}
        >
          Continuer vers le paiement
        </button>

        {sent && (
          <div className="driver-recharge-success" role="status">
            <CircleCheck size={20} />
            Demande envoyée. L'admin va valider votre recharge sous peu.
          </div>
        )}

        {/* ===== MODALE PAIEMENT ===== */}
        {modalOpen && operator && (
          <div className="driver-recharge-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="driver-recharge-modal-backdrop"
              aria-label="Fermer"
              onClick={closeModal}
            />

            <div className="driver-recharge-modal-card">
              <button
                type="button"
                className="driver-recharge-modal-close"
                aria-label="Fermer"
                onClick={closeModal}
              >
                <X size={18} />
              </button>

              <h3 className="driver-recharge-modal-title">Paiement {operator.name}</h3>

              <div className="driver-recharge-recap">
                <div className="driver-recharge-recap-row">
                  <span>Montant à envoyer</span>
                  <strong>{fcfa(amount ?? 0)}</strong>
                </div>
                <div className="driver-recharge-recap-row">
                  <span>Frais de dépôt</span>
                  <strong>{fcfa(depositFee)}</strong>
                </div>
                <div className="driver-recharge-recap-row driver-recharge-recap-row--total">
                  <span>Total débité</span>
                  <strong>{fcfa(totalToSend)}</strong>
                </div>
                <div className="driver-recharge-recap-row">
                  <span>Numéro destinataire</span>
                  <strong>{operator.phone}</strong>
                </div>
              </div>

              {!paid ? (
                <>
                  <p className="driver-recharge-instructions">
                    Envoyez <strong>{fcfa(amount ?? 0)}</strong> au{' '}
                    <strong>{operator.phone}</strong> via {operator.name}. Suivez le menu vocal pour
                    saisir le numéro, le montant ({fcfa(amount ?? 0)}) et votre code PIN. Les frais
                    de dépôt ({fcfa(depositFee)}) sont à votre charge.
                  </p>

                  {operator.appScheme ? (
                    <>
                      <button
                        type="button"
                        className="driver-recharge-open"
                        onClick={() => openOperatorLink(operator)}
                      >
                        <ExternalLink size={16} />
                        Composer le code USSD {operator.ussd}
                      </button>

                      <button
                        type="button"
                        className={`driver-recharge-open driver-recharge-open--${operator.key}`}
                        onClick={() => openOperatorApp(operator)}
                      >
                        <ExternalLink size={16} />
                        Ouvrir l'application {operator.appLabel}
                      </button>

                      <p className="driver-recharge-ussd">
                        Le numéro de dépôt à saisir est : <code>{operator.depositNumber}</code>
                      </p>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="driver-recharge-open"
                        onClick={() => openOperatorLink(operator)}
                      >
                        <ExternalLink size={16} />
                        Ouvrir {operator.action}
                      </button>

                      <p className="driver-recharge-ussd">
                        Code USSD : <code>{ussdCode}</code>
                      </p>
                    </>
                  )}

                  <a
                    className="driver-recharge-weblink"
                    href={operator.webLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pas d'application ? Ouvrir le site web
                  </a>

                  <button
                    type="button"
                    className="driver-recharge-paid"
                    onClick={() => setPaid(true)}
                  >
                    <Check size={16} />
                    J'ai payé, envoyer la capture
                  </button>
                </>
              ) : (
                <>
                  <p className="driver-recharge-instructions">
                    Ajoutez une capture d'écran de votre paiement pour validation.
                  </p>

                  {screenshot ? (
                    <div className="driver-recharge-preview">
                      <img src={screenshot} alt="Capture du paiement" />
                      <button
                        type="button"
                        className="driver-recharge-preview-change"
                        onClick={() => {
                          setScreenshot('');
                          setShotBytes(0);
                        }}
                      >
                        Changer l'image
                      </button>

                      <small className="driver-recharge-preview-size">
                        Capture compressée : {Math.round(shotBytes / 1024)} Ko (max{' '}
                        {MAX_SHOT_KB} Ko)
                      </small>
                    </div>
                  ) : (
                    <label className="driver-recharge-upload">
                      <ImagePlus size={24} />
                      <span>
                        {compressing
                          ? 'Compression de la capture…'
                          : 'Choisir une capture d’écran'}
                      </span>
                      <small>
                        PNG ou JPG · max {MAX_FILE_MB} Mo (compressée sous{' '}
                        {MAX_SHOT_KB} Ko)
                      </small>
                      <input type="file" accept="image/*" onChange={handleFile} />
                    </label>
                  )}

                  {fileError && (
                    <p className="driver-recharge-error">
                      <AlertCircle size={14} />
                      {fileError}
                    </p>
                  )}

                  <button
                    type="button"
                    className="driver-recharge-submit"
                    disabled={!screenshot || compressing}
                    onClick={handleSubmit}
                  >
                    <Send size={16} />
                    Envoyer pour validation
                  </button>
                </>
              )}

              <p className="driver-recharge-secure">
                <ShieldCheck size={13} />
                Validation manuelle par un administrateur Taxi-Moto.
              </p>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}


