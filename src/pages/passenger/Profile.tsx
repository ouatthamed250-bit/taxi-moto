import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  HelpCircle,
  LogOut,
  MapPin,
  Shield,
  Wallet,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import './Profile.css';

const OPTIONS = [
  { icon: Wallet, label: 'Moyens de paiement', hint: 'Cartes, Mobile Money' },
  { icon: Shield, label: 'Sécurité et confidentialité', hint: 'Compte et données' },
  { icon: HelpCircle, label: 'Aide et assistance', hint: 'FAQ et support' },
];

export default function PassengerProfile() {
  const navigate = useNavigate();
  const { userName, phone, passengerHistory, logout } = useApp();

  const completed = passengerHistory.filter((ride) => ride.status === 'completed');
  const totalSpent = completed.reduce((sum, ride) => sum + ride.price, 0);

  const displayName = userName || 'Passager';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'P';

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="profile-page">

        {/* Background decoration */}
        <div className="profile-bg-orb profile-bg-orb--orange" />
        <div className="profile-bg-orb profile-bg-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="profile-topbar">
          <button
            type="button"
            className="profile-back"
            aria-label="Retour"
            onClick={() => navigate('/passenger')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="profile-topbar-text">
            <span className="profile-topbar-eyebrow">Taxi Moto</span>
            <h1 className="profile-topbar-title">Mon profil</h1>
          </div>

          <div className="profile-logo" aria-hidden="true">
            <div className="profile-logo-pin">
              <MapPin size={15} strokeWidth={2.8} />
            </div>
            <div className="profile-logo-wheel profile-logo-wheel--one" />
            <div className="profile-logo-wheel profile-logo-wheel--two" />
          </div>
        </header>

        {/* ===== CARTE UTILISATEUR ===== */}
        <section className="profile-card">
          <div className="profile-avatar">{initial}</div>

          <div className="profile-identity">
            <strong className="profile-name">{displayName}</strong>
            <span className="profile-phone">{phone || '+225 —'}</span>

            <span className="profile-verified">
              <BadgeCheck size={13} />
              Compte vérifié
            </span>
          </div>
        </section>

        {/* ===== STATS ===== */}
        <section className="profile-stats">
          <div className="profile-stat">
            <strong>{completed.length}</strong>
            <span>Nombre de courses</span>
          </div>

          <div className="profile-stat">
            <strong>{fcfa(totalSpent)}</strong>
            <span>Total dépensé</span>
          </div>
        </section>

        {/* ===== OPTIONS ===== */}
        <nav className="profile-menu">
          {OPTIONS.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                className="profile-menu-item"
              >
                <span className="profile-menu-icon">
                  <Icon size={19} />
                </span>

                <span className="profile-menu-content">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>

                <ChevronRight size={18} className="profile-menu-chevron" />
              </button>
            );
          })}
        </nav>

        {/* ===== DÉCONNEXION ===== */}
        <button
          type="button"
          className="profile-logout"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          <span className="profile-logout-icon">
            <LogOut size={18} />
          </span>
          Se déconnecter
        </button>

      </div>
    </Page>
  );
}
