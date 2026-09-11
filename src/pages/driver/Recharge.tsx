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
import './Recharge.css';

/** Montants rapides proposés (FCFA). */
const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000];
const MIN_RECHARGE = 500;
const MAX_RECHARGE = 500000;
const MAX_FILE_MB = 5;

type OperatorTone = 'orange' | 'wave' | 'mtn' | 'moov';

interface MobileOperator {
  key: string;
  name: string;
  phone: string;
  tone: OperatorTone;
  available: boolean;
  /** Deep link vers l'app mobile money (peut ne pas être installée). */
  deepLink: string;
  /** Lien web de secours si l'app n'est pas installée. */
  webLink: string;
  /** Libellé court du bouton « Ouvrir … ». */
  action: string;
}

const OPERATORS: MobileOperator[] = [
  {
    key: 'orange',
    name: 'Orange Money',
    phone: '0749883981',
    tone: 'orange',
    available: true,
    deepLink: 'orange-money://',
    webLink: 'https://orange.ci/',
    action: 'Orange Money',
  },
  {
    key: 'wave',
    name: 'Wave',
    phone: '0554233234',
    tone: 'wave',
    available: true,
    deepLink: 'wave://',
    webLink: 'https://wave.com/',
    action: 'Wave',
  },
  {
    key: 'mtn',
    name: 'MTN Money',
    phone: '0554233234',
    tone: 'mtn',
    available: true,
    deepLink: 'mtn-momo://',
    webLink: 'https://mtn.ci/',
    action: 'MTN',
  },
  {
    key: 'moov',
    name: 'Moov Money',
    phone: '—',
    tone: 'moov',
    available: false,
    deepLink: '',
    webLink: '',
    action: 'Moov',
  },
];

/**
 * Ouvre le lien de l'opérateur : deep link d'abord (app mobile money),
 * sinon lien web de secours. Sur le web, `Linking.openURL` (React Native)
 * n'existe pas → on utilise window.open.
 */
function openOperatorLink(operator: MobileOperator): void {
  if (!operator.deepLink) return;
  const popup = window.open(operator.deepLink, '_blank', 'noopener,noreferrer');
  if (!popup) window.location.href = operator.webLink || operator.deepLink;
}

export default function DriverRecharge() {
  const navigate = useNavigate();
  const { userName, phone, driverBalance, submitRechargeRequest } = useApp();

  const [preset, setPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [operatorKey, setOperatorKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [screenshot, setScreenshot] = useState('');
  const [fileError, setFileError] = useState('');
  const [sent, setSent] = useState(false);

  const operator = OPERATORS.find((item) => item.key === operatorKey) ?? null;
  const amount = customAmount.trim() !== '' ? Number(customAmount) : preset;
  const amountValid =
    amount !== null && Number.isFinite(amount) && amount >= MIN_RECHARGE && amount <= MAX_RECHARGE;
  const canContinue = amountValid && operator?.available === true;

  const choosePreset = (value: number) => {
    setPreset(value);
    setCustomAmount('');
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value.replace(/[^0-9]/g, ''));
    setPreset(null);
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
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
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const closeModal = () => {
    setModalOpen(false);
    setPaid(false);
    setScreenshot('');
    setFileError('');
  };

  const handleSubmit = () => {
    if (!operator || !amountValid || !screenshot) return;

    submitRechargeRequest({
      driverId: phone || 'driver-local',
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
              Minimum 500 FCFA · Maximum 500 000 FCFA
            </small>
          </label>
        </section>

        {/* ===== MÉTHODE ===== */}
        <section className="driver-recharge-block">
          <h2 className="driver-recharge-section-title">Choisissez la méthode</h2>

          <div className="driver-recharge-operators">
            {OPERATORS.map((item) => {
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
                  <span>Numéro destinataire</span>
                  <strong>{operator.phone}</strong>
                </div>
              </div>

              {!paid ? (
                <>
                  <p className="driver-recharge-instructions">
                    Envoyez <strong>{fcfa(amount ?? 0)}</strong> au{' '}
                    <strong>{operator.phone}</strong> via {operator.name}. Les frais de dépôt sont à
                    votre charge.
                  </p>

                  <button
                    type="button"
                    className="driver-recharge-open"
                    onClick={() => openOperatorLink(operator)}
                  >
                    <ExternalLink size={16} />
                    Ouvrir {operator.action}
                  </button>

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
                        onClick={() => setScreenshot('')}
                      >
                        Changer l'image
                      </button>
                    </div>
                  ) : (
                    <label className="driver-recharge-upload">
                      <ImagePlus size={24} />
                      <span>Choisir une capture d'écran</span>
                      <small>PNG ou JPG · max {MAX_FILE_MB} Mo</small>
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
                    disabled={!screenshot}
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


