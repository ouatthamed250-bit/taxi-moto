import { useRef, useState } from 'react';
import { Bell, Lock, Shield, ShieldCheck } from 'lucide-react';
import { useApp } from '../../store/useApp';
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

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
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

      {toast && <div className="admin-toast">{toast}</div>}
    </>
  );
}
