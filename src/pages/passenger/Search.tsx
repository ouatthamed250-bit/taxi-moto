import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Car,
  Info,
  MapPin,
  Radar,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { RideStatus, VehicleType } from '../../types';
import './Search.css';

/** États pour lesquels le client doit suivre sa course. */
const FOLLOW_STATES: RideStatus[] = [
  'driver_found',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
  'completed',
];

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.jpg',
  tricycle: '/images/tricycle.jpg',
};

export default function Searching() {
  const navigate = useNavigate();
  const {
    rideStatus,
    offers,
    vehicle,
    passengers,
    destination,
    destinationLibre,
    distanceKm,
    cancelRide,
  } = useApp();

  // Fallback visuel si le visuel véhicule ne charge pas (badge + icône).
  const [vehicleImageBroken, setVehicleImageBroken] = useState(false);

  const vehicleKey: VehicleType = vehicle ?? 'moto';
  const info = VEHICLES[vehicleKey];
  const estimate = estimateFare(distanceKm);

  /**
   * Suivi de l'état de la course — AUCUNE ANNULATION AUTOMATIQUE.
   *
   * La demande reste publiée sur la Realtime Database tant que le client ne
   * l'annule pas : le conducteur a tout le temps de répondre (bip répété).
   *   • 'offers'   → écran des propositions de prix ;
   *   • 'driver_found' et suivants → suivi de course (le conducteur a accepté) ;
   *   • 'idle'     → aucun conducteur n'était disponible au moment de commander.
   */
  useEffect(() => {
    if (rideStatus === 'offers') {
      navigate(
        offers.length > 0 ? '/passenger/offers' : '/passenger/unavailable',
        offers.length > 0 ? undefined : { state: { reason: 'no-driver' } },
      );
      return;
    }

    if (FOLLOW_STATES.includes(rideStatus)) {
      navigate('/passenger/tracking');
      return;
    }

    if (rideStatus === 'idle') {
      navigate('/passenger/unavailable', { state: { reason: 'no-driver' } });
    }
  }, [rideStatus, offers, navigate]);

  const cancelSearch = () => {
    cancelRide();
    navigate('/passenger');
  };

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="search-page">

        {/* Background decoration */}
        <div className="search-bg-orb search-bg-orb--orange" />
        <div className="search-bg-orb search-bg-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="search-topbar">
          <button
            type="button"
            className="search-back"
            aria-label="Retour"
            onClick={cancelSearch}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="search-topbar-text">
            <span className="search-topbar-eyebrow">Taxi Moto</span>
            <h1 className="search-topbar-title">Recherche</h1>
          </div>

          <div className="search-logo" aria-hidden="true">
            <div className="search-logo-pin">
              <Radar size={16} strokeWidth={2.6} />
            </div>
            <div className="search-logo-wheel search-logo-wheel--one" />
            <div className="search-logo-wheel search-logo-wheel--two" />
          </div>
        </header>

        {/* ===== RADAR ===== */}
        <main className="search-main">
          <div className="search-radar">
            <span className="search-radar-ring" />
            <span className="search-radar-ring" />
            <span className="search-radar-ring" />

            <span className="search-radar-core">
              <Radar size={34} />
            </span>
          </div>

          <h2 className="search-title">Recherche d’un conducteur…</h2>
          <p className="search-subtitle">
            Votre demande est envoyée aux conducteurs en ligne — elle reste
            active jusqu’à leur réponse.
          </p>
        </main>

        {/* ===== CARTE INFO ===== */}
        <section className="search-card">
          <div className="search-info-row">
            <span className="search-info-icon search-info-icon--dest">
              <MapPin size={17} />
            </span>

            <div className="search-info-content">
              <strong>Destination</strong>
              <span>{destination || 'À définir'}</span>
            </div>
          </div>

          {destinationLibre && (
            <p className="free-destination-note">
              <Info size={14} />
              Destination hors base — le chauffeur vous contactera pour confirmer
            </p>
          )}

          <div className="search-info-row">
            <span className="search-vehicle-badge">
              {vehicleImageBroken ? (
                vehicleKey === 'moto' ? (
                  <Bike size={20} strokeWidth={1.9} />
                ) : (
                  <Car size={20} strokeWidth={1.9} />
                )
              ) : (
                <img
                  className="search-vehicle-img"
                  src={VEHICLE_IMAGES[vehicleKey]}
                  alt={info.label}
                  onError={() => setVehicleImageBroken(true)}
                />
              )}
            </span>

            <div className="search-info-content">
              <strong>{info.label}</strong>
              <span>{info.description}</span>
            </div>
          </div>

          <div className="search-info-row">
            <span className="search-info-icon search-info-icon--people">
              <UsersRound size={17} />
            </span>

            <div className="search-info-content">
              <strong>Passagers</strong>
              <span>
                {passengers} passager{passengers > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="search-info-row">
            <span className="search-info-icon search-info-icon--price">
              <Wallet size={17} />
            </span>

            <div className="search-info-content">
              <strong>Estimation</strong>
              <span>
                {fcfa(estimate.min)} – {fcfa(estimate.max)}
              </span>
            </div>
          </div>
        </section>

        {/* ===== ANNULER ===== */}
        <button type="button" className="search-cancel" onClick={cancelSearch}>
          <X size={18} />
          Annuler la recherche
        </button>

      </div>
    </Page>
  );
}
