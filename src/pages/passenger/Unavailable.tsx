import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MapPin, MapPinOff, Radar, Smartphone } from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import './Unavailable.css';

/**
 * Raison de l'indisponibilité :
 *  - 'zone'      : la destination est HORS zone de couverture ;
 *  - 'no-driver' : destination couverte, mais aucun conducteur disponible.
 * ⚠️ Ne jamais afficher « zone non couverte » pour une destination couverte
 * (bug : un quartier de la base comme « Gonzagueville — Éléphant » pouvait
 * être annoncé comme non couvert).
 */
type UnavailableReason = 'zone' | 'no-driver';

const COPY: Record<
  UnavailableReason,
  { title: string; subtitleStart: string; subtitleEnd: string; badge: string; notify: string }
> = {
  zone: {
    title: 'Zone non couverte pour l’instant',
    subtitleStart: 'Taxi-Moto n’est pas encore disponible à',
    subtitleEnd: 'Nous nous étendons rapidement.',
    badge: 'Bientôt disponible',
    notify: 'M’avertir lorsque le service sera disponible',
  },
  'no-driver': {
    title: 'Aucun conducteur disponible',
    subtitleStart: 'Aucun chauffeur en ligne autour de',
    subtitleEnd:
      'Votre destination est bien dans la zone couverte : réessayez dans quelques minutes.',
    badge: 'Réessayer bientôt',
    notify: 'M’avertir dès qu’un conducteur sera disponible',
  },
};

export default function Unavailable() {
  const navigate = useNavigate();
  const location = useLocation();
  const { destination, distanceKm, phone } = useApp();

  const [notified, setNotified] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  /* La raison vient de Home/Search/Offers (state de navigation) ou de l'URL. */
  const stateReason = (location.state as { reason?: UnavailableReason } | null)?.reason;
  const queryReason = new URLSearchParams(location.search).get('reason');
  const reason: UnavailableReason =
    stateReason ?? (queryReason === 'zone' ? 'zone' : 'no-driver');
  const copy = COPY[reason];

  const estimate = estimateFare(distanceKm);
  const zone = destination || 'cette zone';

  // Confirmation affichée, puis retour à l'accueil.
  useEffect(() => {
    if (!notified) return undefined;
    const timer = window.setTimeout(() => navigate('/passenger'), 1300);
    return () => window.clearTimeout(timer);
  }, [notified, navigate]);

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="unavailable-page">

        {/* Background decoration */}
        <div className="unavailable-orb unavailable-orb--orange" />
        <div className="unavailable-orb unavailable-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="unavailable-topbar">
          <button
            type="button"
            className="unavailable-back"
            aria-label="Retour"
            onClick={() => navigate('/passenger')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="unavailable-brand">
            <div className="unavailable-logo" aria-hidden="true">
              <div className="unavailable-logo-pin">
                <Radar size={14} strokeWidth={2.6} />
              </div>
              <div className="unavailable-logo-wheel unavailable-logo-wheel--one" />
              <div className="unavailable-logo-wheel unavailable-logo-wheel--two" />
            </div>
            <span className="unavailable-brand-text">Taxi Moto</span>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className="unavailable-hero">
          <div className="unavailable-icon">
            <span className="unavailable-icon-glow" />
            <span className="unavailable-icon-core">
              <MapPinOff size={38} strokeWidth={2.1} />
            </span>
          </div>

          <h1 className="unavailable-title">{copy.title}</h1>

          <p className="unavailable-subtitle">
            {copy.subtitleStart} <strong>{zone}</strong>. {copy.subtitleEnd}
          </p>
        </section>

        {/* ===== CARTE (glass) ===== */}
        <section className="unavailable-card">
          <div className="unavailable-row">
            <span className="unavailable-row-icon">
              <MapPin size={17} />
            </span>

            <div className="unavailable-row-content">
              <strong>Destination demandée</strong>
              <span>{zone}</span>
            </div>

            <span className="unavailable-badge">{copy.badge}</span>
          </div>

          <p className="unavailable-message">
            Laissez-nous votre numéro pour être averti dès l’ouverture.
          </p>

          {phone ? (
            <div className="unavailable-phone">
              <Smartphone size={16} />
              <span>{phone}</span>
            </div>
          ) : (
            <input
              className="unavailable-input"
              type="tel"
              inputMode="tel"
              placeholder="Votre numéro (+225)"
              value={userPhone}
              onChange={(event) => setUserPhone(event.target.value)}
            />
          )}

          <p className="unavailable-estimate">
            Prix habituellement observé en zone couverte : {fcfa(estimate.min)} –{' '}
            {fcfa(estimate.max)}
          </p>
        </section>

        {/* ===== ACTIONS ===== */}
        <button
          type="button"
          className="unavailable-notify"
          onClick={() => setNotified(true)}
        >
          <Bell size={18} />
          {notified ? 'Alerte activée ✓' : copy.notify}
        </button>

        <button
          type="button"
          className="unavailable-home"
          onClick={() => navigate('/passenger')}
        >
          Retour à l’accueil
        </button>
      </div>
    </Page>
  );
}
