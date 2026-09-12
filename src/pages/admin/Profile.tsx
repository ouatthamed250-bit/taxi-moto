import { useRef, useState } from 'react';
import { AlertTriangle, Bell, Lock, Shield, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../store/useApp';
import { ADMIN_CODE_LENGTH, updateAdminCode } from '../../services/adminAuth';
import './Profile.css';

const ADMIN_NAME = 'Administrateur';
const ADMIN_EMAIL = 'admin@taxi-moto.ci';

const ACTIONS = [
  {
    key: 'password',
    icon: Lock,
    label: 'Changer le mot de passe',
    hint: 'Mettre à jour le mot de passe administrateur',
  },
  {
    key: 'security',
    icon: Shield,
    label: 'Paramètres de sécurité',
    hint: 'Double authentification, sessions actives',
  },
  {
    key: 'notifications',
    icon: Bell,
    label: 'Notifications',
    hint: 'Alertes et rapports automatiques',
  },
];

export default function AdminProfile() {
  const { userName } = useApp();
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const openCodeModal = () => {
    setOldCode('');
    setNewCode('');
    setConfirmCode('');
    setCodeError('');
    setCodeModalOpen(true);
  };

  const submitCode = () => {
    setCodeError('');

    if (newCode.length !== ADMIN_CODE_LENGTH) {
      setCodeError(`Le nouveau code doit contenir ${ADMIN_CODE_LENGTH} chiffres.`);
      return;
    }
    if (newCode !== confirmCode) {
      setCodeError('La confirmation ne correspond pas.');
      return;
    }

    const result = updateAdminCode(oldCode, newCode);
    if (!result.success) {
      setCodeError(result.error ?? 'Modification impossible.');
      return;
    }

    showToast('Code administrateur modifié ✅');
    setCodeModalOpen(false);
  };

  const displayName = userName || ADMIN_NAME;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Mon profil administrateur</h1>
          <p className="admin-page-subtitle">Compte réservé à l'administration Taxi-Moto.</p>
        </div>
      </div>

      <section className="admin-section admin-profile-card">
        <span className="admin-profile-avatar">
          {displayName.trim().charAt(0).toUpperCase() || 'A'}
        </span>

        <div className="admin-profile-info">
          <strong className="admin-profile-name">{displayName}</strong>
          <span className="admin-profile-email">{ADMIN_EMAIL}</span>

          <span className="admin-badge admin-profile-badge">
            <ShieldCheck size={11} />
            Administrateur
          </span>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Shield size={16} />
          </span>
          <h2 className="admin-section-title">Sécurité du compte</h2>
        </div>

        <nav className="admin-profile-menu">
          {ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.key}
                type="button"
                className="admin-profile-item"
                onClick={() => showToast(`${action.label} — bientôt disponible`)}
              >
                <span className="admin-profile-item-icon">
                  <Icon size={18} />
                </span>

                <span className="admin-profile-item-text">
                  <strong>{action.label}</strong>
                  <small>{action.hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <p className="admin-section-note">
          Système d'administration discret : ces options ne sont pas exposées publiquement.
        </p>
      </section>

      {/* ===== SÉCURITÉ : code administrateur ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Lock size={16} />
          </span>
          <h2 className="admin-section-title">Sécurité</h2>
        </div>

        <button type="button" className="admin-profile-item" onClick={openCodeModal}>
          <span className="admin-profile-item-icon">
            <Lock size={18} />
          </span>

          <span className="admin-profile-item-text">
            <strong>Changer le code administrateur</strong>
            <small>Modifier le code d'accès caché ({ADMIN_CODE_LENGTH} chiffres)</small>
          </span>
        </button>
      </section>

      {/* ===== MODALE : CODE ADMIN ===== */}
      {codeModalOpen && (
        <div className="admin-gift-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-gift-backdrop"
            aria-label="Fermer"
            onClick={() => setCodeModalOpen(false)}
          />

          <div className="admin-gift-card">
            <button
              type="button"
              className="admin-gift-close"
              aria-label="Fermer"
              onClick={() => setCodeModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div className="admin-gift-head">
              <span className="admin-gift-icon">
                <Lock size={18} />
              </span>
              <div>
                <strong className="admin-gift-title">Changer le code administrateur</strong>
                <span className="admin-gift-sub">Code de {ADMIN_CODE_LENGTH} chiffres</span>
              </div>
            </div>

            <label className="admin-gift-field">
              <span>Code actuel</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={ADMIN_CODE_LENGTH}
                placeholder="••••••"
                value={oldCode}
                onChange={(event) =>
                  setOldCode(event.target.value.replace(/\D/g, '').slice(0, ADMIN_CODE_LENGTH))
                }
              />
            </label>

            <label className="admin-gift-field">
              <span>Nouveau code</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={ADMIN_CODE_LENGTH}
                placeholder="••••••"
                value={newCode}
                onChange={(event) =>
                  setNewCode(event.target.value.replace(/\D/g, '').slice(0, ADMIN_CODE_LENGTH))
                }
              />
            </label>

            <label className="admin-gift-field">
              <span>Confirmer le nouveau code</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={ADMIN_CODE_LENGTH}
                placeholder="••••••"
                value={confirmCode}
                onChange={(event) =>
                  setConfirmCode(event.target.value.replace(/\D/g, '').slice(0, ADMIN_CODE_LENGTH))
                }
              />
            </label>

            {codeError && (
              <p className="admin-gift-error">
                <AlertTriangle size={14} />
                {codeError}
              </p>
            )}

            <button type="button" className="admin-gift-submit" onClick={submitCode}>
              <Lock size={16} />
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {toast && <div className="admin-toast">{toast}</div>}
    </>
  );
}
