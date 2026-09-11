import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MapPin, MapPinOff, Radar, Smartphone } from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import './Unavailable.css';

export default function Unavailable() {
  const navigate = useNavigate();
  const { destination, distanceKm, phone } = useApp();

  const [notified, setNotified] = useState(false);
  const [userPhone, setUserPhone] = useState('');

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

          <h1 className="unavailable-title">Zone non couverte pour l’instant</h1>

          <p className="unavailable-subtitle">
            Taxi-Moto n’est pas encore disponible à <strong>{zone}</strong>. Nous nous
            étendons rapidement.
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

            <span className="unavailable-badge">Bientôt disponible</span>
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
          {notified ? 'Alerte activée ✓' : 'M’avertir lorsque le service sera disponible'}
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
