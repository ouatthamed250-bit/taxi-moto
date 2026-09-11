import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Car,
  MapPin,
  Radar,
  RotateCcw,
  Search,
  Star,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { Page } from '../../components/Page';
import {
  COLORS,
  VEHICLES,
  commissionOf,
  estimateFare,
  fcfa,
  netEarnings,
} from '../../theme';
import { useApp } from '../../store/useApp';
import type { VehicleType } from '../../types';
import './Offers.css';

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.jpg',
  tricycle: '/images/tricycle.jpg',
};

export default function Offers() {
  const navigate = useNavigate();
  const {
    offers,
    chooseOffer,
    passengers,
    vehicle,
    distanceKm,
    destination,
    cancelRide,
  } = useApp();

  // Fallback visuel si le visuel véhicule ne charge pas (badge + icône).
  const [vehicleImageBroken, setVehicleImageBroken] = useState(false);

  const vehicleKey: VehicleType = vehicle ?? 'moto';
  const info = VEHICLES[vehicleKey];
  const estimate = estimateFare(distanceKm);

  const pick = (id: string) => {
    const found = offers.find((offer) => offer.id === id);
    if (!found) return;
    chooseOffer(found);
    navigate('/passenger/tracking');
  };

  const backToHome = () => {
    cancelRide();
    navigate('/passenger');
  };

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="offers-page">

        {/* Background decoration */}
        <div className="offers-bg-orb offers-bg-orb--orange" />
        <div className="offers-bg-orb offers-bg-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="offers-topbar">
          <button
            type="button"
            className="offers-back"
            aria-label="Retour"
            onClick={backToHome}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="offers-topbar-text">
            <span className="offers-topbar-eyebrow">Taxi Moto</span>
            <h1 className="offers-topbar-title">Offres disponibles</h1>
          </div>

          <div className="offers-logo" aria-hidden="true">
            <div className="offers-logo-pin">
              <Radar size={16} strokeWidth={2.6} />
            </div>
            <div className="offers-logo-wheel offers-logo-wheel--one" />
            <div className="offers-logo-wheel offers-logo-wheel--two" />
          </div>
        </header>

        <p className="offers-subtitle">
          {offers.length > 1
            ? `${offers.length} conducteurs ont proposé un prix`
            : offers.length === 1
              ? '1 conducteur a proposé un prix'
              : 'Aucune proposition pour le moment'}
        </p>

        {/* ===== RÉCAP COURSE ===== */}
        <section className="offers-recap">
          <div className="offers-recap-row">
            <span className="offers-recap-icon offers-recap-icon--dest">
              <MapPin size={17} />
            </span>

            <div className="offers-recap-content">
              <strong>Destination</strong>
              <span>{destination || 'À définir'}</span>
            </div>
          </div>

          <div className="offers-recap-row">
            <span className="offers-vehicle-badge">
              {vehicleImageBroken ? (
                vehicleKey === 'moto' ? (
                  <Bike size={20} strokeWidth={1.9} />
                ) : (
                  <Car size={20} strokeWidth={1.9} />
                )
              ) : (
                <img
                  className="offers-vehicle-img"
                  src={VEHICLE_IMAGES[vehicleKey]}
                  alt={info.label}
                  onError={() => setVehicleImageBroken(true)}
                />
              )}
            </span>

            <div className="offers-recap-content">
              <strong>{info.label}</strong>
              <span>{info.description}</span>
            </div>
          </div>

          <div className="offers-recap-row">
            <span className="offers-recap-icon offers-recap-icon--people">
              <UsersRound size={17} />
            </span>

            <div className="offers-recap-content">
              <strong>Passagers</strong>
              <span>
                {passengers} passager{passengers > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="offers-recap-row">
            <span className="offers-recap-icon offers-recap-icon--price">
              <Wallet size={17} />
            </span>

            <div className="offers-recap-content">
              <strong>Prix estimé Taxi-Moto</strong>
              <span>
                {fcfa(estimate.min)} – {fcfa(estimate.max)}
              </span>
            </div>
          </div>
        </section>

        {/* ===== LISTE DES OFFRES ===== */}
        {offers.length === 0 ? (
          <section className="offers-empty">
            <span className="offers-empty-icon">
              <Search size={30} strokeWidth={1.8} />
            </span>

            <strong>Aucune offre disponible</strong>
            <p>
              Les conducteurs près de vous n’ont pas encore répondu.
              Modifiez votre recherche pour réessayer.
            </p>

            <button type="button" className="offers-empty-button" onClick={backToHome}>
              <RotateCcw size={17} />
              Modifier ma recherche
            </button>
          </section>
        ) : (
          <div className="offers-list">
            {offers.map((offer) => {
              const driver = offer.driver;
              const initial = driver.name.trim().charAt(0).toUpperCase() || 'C';

              return (
                <article
                  key={offer.id}
                  className={`offers-card offers-card--${driver.vehicle}`}
                >
                  <div className="offers-card-head">
                    <span className="offers-avatar">{initial}</span>

                    <div className="offers-driver">
                      <strong className="offers-driver-name">{driver.name}</strong>

                      <span className="offers-driver-rating">
                        <Star size={12} fill="currentColor" />
                        {driver.rating}
                        <span className="offers-driver-sep">·</span>
                        {driver.rides} courses
                      </span>

                      <span className="offers-driver-vehicle">
                        {VEHICLES[driver.vehicle].label} · {driver.plate}
                      </span>
                    </div>

                    <div className="offers-price">
                      <strong>{fcfa(offer.price)}</strong>
                      <span>prix proposé</span>
                    </div>
                  </div>

                  <p className="offers-net">
                    Commission 7 % ({fcfa(commissionOf(offer.price))}) · Net
                    chauffeur : {fcfa(netEarnings(offer.price))}
                  </p>

                  <button
                    type="button"
                    className="offers-pick"
                    onClick={() => pick(offer.id)}
                  >
                    Choisir ce chauffeur
                  </button>
                </article>
              );
            })}
          </div>
        )}


        <p className="offers-footnote">
          Le prix accepté dans l’application est verrouillé.
        </p>

      </div>
    </Page>
  );
}
