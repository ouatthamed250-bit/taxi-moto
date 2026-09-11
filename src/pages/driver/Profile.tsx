import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Radar,
  Shield,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { VehicleType } from '../../types';
import './Profile.css';

const DRIVER_RATING = 4.8;
const DRIVER_RIDES = 412;
const DRIVER_PLATE = 'AB-1234-CI';

const VEHICLE_MODELS: Record<VehicleType, string> = {
  moto: 'Yamaha Crux',
  tricycle: 'TVS King',
};

const MENU = [
  { key: 'vehicle', icon: Bike, label: 'Mon véhicule', hint: 'Véhicule, modèle et plaque' },
  { key: 'documents', icon: FileText, label: 'Mes documents', hint: 'Permis, carte grise…' },
  { key: 'payments', icon: Wallet, label: 'Moyens de paiement', hint: 'Mobile Money, banque' },
  {
    key: 'security',
    icon: Shield,
    label: 'Sécurité et confidentialité',
    hint: 'Compte et données',
  },
  { key: 'help', icon: HelpCircle, label: 'Aide et assistance', hint: 'FAQ et support' },
];

export default function DriverProfile() {
  const navigate = useNavigate();
  const { userName, phone, driverApproved, vehicle, driverRidesToday, driverNet, logout } =
    useApp();

  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  };

  const vehicleKey: VehicleType = vehicle ?? 'moto';
  const info = VEHICLES[vehicleKey];
  const model = VEHICLE_MODELS[vehicleKey];
  const displayName = userName || 'Conducteur';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'C';

  const handleMenu = (key: string) => {
    if (key === 'vehicle') {
      showToast(`${info.label} · ${model} · ${DRIVER_PLATE}`);
      return;
    }

    const item = MENU.find((entry) => entry.key === key);
    showToast(`${item ? item.label : 'Cette option'} — bientôt disponible`);
  };

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-profile-page">

        {/* Background decoration */}
        <div className="driver-profile-orb driver-profile-orb--orange" />
        <div className="driver-profile-orb driver-profile-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="driver-profile-topbar">
          <button
            type="button"
            className="driver-profile-back"
            aria-label="Retour"
            onClick={() => navigate('/driver')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="driver-profile-brand">
            <div className="driver-profile-logo" aria-hidden="true">
              <div className="driver-profile-logo-pin">
                <Radar size={15} strokeWidth={2.6} />
              </div>
              <div className="driver-profile-logo-wheel driver-profile-logo-wheel--one" />
              <div className="driver-profile-logo-wheel driver-profile-logo-wheel--two" />
            </div>

            <div className="driver-profile-brand-text">
              <span className="driver-profile-eyebrow">Taxi Moto</span>
              <h1 className="driver-profile-title">Mon profil conducteur</h1>
            </div>
          </div>
        </header>

        {/* ===== CARTE UTILISATEUR ===== */}
        <section className="driver-profile-card">
          <div className="driver-profile-avatar">{initial}</div>

          <div className="driver-profile-identity">
            <strong className="driver-profile-name">{displayName}</strong>
            <span className="driver-profile-phone">{phone || '+225 —'}</span>

            <div className="driver-profile-badges">
              <span
                className={`driver-profile-badge ${
                  driverApproved ? 'driver-profile-badge--green' : 'driver-profile-badge--orange'
                }`}
              >
                <ShieldCheck size={12} />
                {driverApproved ? 'Conducteur vérifié' : 'Validation en attente'}
              </span>

              <span className="driver-profile-badge driver-profile-badge--navy">
                <Star size={11} fill="currentColor" />
                {info.label}
              </span>
            </div>

            <span className="driver-profile-plate">{DRIVER_PLATE}</span>
          </div>
        </section>

        {/* ===== NOTE MOYENNE ===== */}
        <section className="driver-profile-rating">
          <div className="driver-profile-rating-left">
            <span className="driver-profile-rating-icon">
              <Star size={18} fill="currentColor" />
            </span>

            <div>
              <strong className="driver-profile-rating-value">{DRIVER_RATING}</strong>
              <span className="driver-profile-rating-label">Note moyenne</span>
            </div>
          </div>

          <span className="driver-profile-rating-rides">
            {DRIVER_RIDES} courses réalisées
          </span>
        </section>

        {/* ===== STATS ===== */}
        <section className="driver-profile-stats">
          <div className="driver-profile-stat">
            <strong>{driverRidesToday.length}</strong>
            <span>Courses</span>
          </div>

          <div className="driver-profile-stat">
            <strong>{DRIVER_RATING}</strong>
            <span>Note moyenne</span>
          </div>

          <div className="driver-profile-stat driver-profile-stat--net">
            <strong>{fcfa(driverNet)}</strong>
            <span>Net gagné</span>
          </div>
        </section>

        {/* ===== OPTIONS ===== */}
        <nav className="driver-profile-menu">
          {MENU.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                className="driver-profile-menu-item"
                onClick={() => handleMenu(item.key)}
              >
                <span className="driver-profile-menu-icon">
                  <Icon size={19} />
                </span>

                <span className="driver-profile-menu-content">
                  <strong>{item.label}</strong>
                  <small>
                    {item.key === 'vehicle' ? `${info.label} · ${model}` : item.hint}
                  </small>
                </span>

                <ChevronRight size={18} className="driver-profile-menu-chevron" />
              </button>
            );
          })}
        </nav>

        {/* ===== DÉCONNEXION ===== */}
        <button
          type="button"
          className="driver-profile-logout"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          <span className="driver-profile-logout-icon">
            <LogOut size={18} />
          </span>
          Se déconnecter
        </button>

        {toast && <div className="driver-profile-toast">{toast}</div>}
      </div>
    </Page>
  );
}
