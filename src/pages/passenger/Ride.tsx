import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  MapPin,
  MapPinned,
  Radar,
  Star,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, commissionOf, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { VehicleType } from '../../types';
import './Ride.css';

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.png',
  tricycle: '/images/tricycle.png',
};

/** États « sur la route » (avant la notation). */
const TRIP_STATES = [
  'searching',
  'offers',
  'driver_found',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
];

/** Inclut 'completed' : l'écran de notation s'affiche une fois la course finie. */
const ACTIVE = [...TRIP_STATES, 'completed'];

export default function PassengerRide() {
  const navigate = useNavigate();
  const {
    rideStatus,
    selectedOffer,
    lastRide,
    vehicle,
    destination,
    distanceKm,
    rateRide,
    resetBooking,
  } = useApp();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [vehicleImageBroken, setVehicleImageBroken] = useState(false);

  const isActive = ACTIVE.includes(rideStatus);
  const onTrip = TRIP_STATES.includes(rideStatus);
  const showRecap = !onTrip && (isActive || Boolean(lastRide));

  const follow = () => {
    if (rideStatus === 'searching') {
      navigate('/passenger/search');
      return;
    }
    if (rideStatus === 'offers') {
      navigate('/passenger/offers');
      return;
    }
    navigate('/passenger/tracking');
  };

  // Récap : `lastRide` survit à resetBooking(), puis repli sur l'état courant.
  const driverName = lastRide?.driverName ?? selectedOffer?.driver.name ?? 'Chauffeur';
  const price = lastRide?.price ?? selectedOffer?.price ?? 0;
  const commission = lastRide?.commission ?? commissionOf(price);
  const rideDestination = lastRide?.destination || destination || '—';
  const rideDistance = lastRide?.distanceKm ?? distanceKm;
  const vehicleKey: VehicleType = lastRide?.vehicle ?? vehicle ?? 'moto';
  const info = VEHICLES[vehicleKey];
  const initial = driverName.trim().charAt(0).toUpperCase() || 'C';

  const submit = () => {
    if (rating > 0) rateRide(rating);
    resetBooking();
    navigate('/passenger');
  };

  const skip = () => {
    resetBooking();
    navigate('/passenger');
  };

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="ride-page">

        {/* Background decoration */}
        <div className="ride-orb ride-orb--orange" />
        <div className="ride-orb ride-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="ride-topbar">
          <div className="ride-brand">
            <div className="ride-logo" aria-hidden="true">
              <div className="ride-logo-pin">
                <Radar size={14} strokeWidth={2.6} />
              </div>
              <div className="ride-logo-wheel ride-logo-wheel--one" />
              <div className="ride-logo-wheel ride-logo-wheel--two" />
            </div>
            <span className="ride-brand-text">Taxi Moto</span>
          </div>
        </header>

        {showRecap ? (
          <>
            {/* ===== SUCCÈS ===== */}
            <section className="ride-hero">
              <div className="ride-done">
                <span className="ride-done-glow" />
                <span className="ride-done-icon">
                  <CheckCircle2 size={42} strokeWidth={2.4} />
                </span>
              </div>

              <h1 className="ride-title">Course terminée !</h1>
              <p className="ride-subtitle">Merci d’avoir voyagé avec Taxi-Moto</p>
            </section>

            {/* ===== RÉCAP ===== */}
            <section className="ride-recap">
              <div className="ride-recap-row">
                <span className="ride-recap-icon ride-recap-icon--dest">
                  <MapPin size={17} />
                </span>

                <div className="ride-recap-content">
                  <strong>Destination</strong>
                  <span>{rideDestination}</span>
                </div>
              </div>

              <div className="ride-recap-row">
                <span className="ride-vehicle-badge">
                  {vehicleImageBroken ? (
                    vehicleKey === 'moto' ? (
                      <Bike size={20} strokeWidth={1.9} />
                    ) : (
                      <Car size={20} strokeWidth={1.9} />
                    )
                  ) : (
                    <img
                      className="ride-vehicle-img"
                      src={VEHICLE_IMAGES[vehicleKey]}
                      alt={info.label}
                      onError={() => setVehicleImageBroken(true)}
                    />
                  )}
                </span>

                <div className="ride-recap-content">
                  <strong>{info.label}</strong>
                  <span>{rideDistance} km</span>
                </div>
              </div>

              <div className="ride-recap-row">
                <span className="ride-avatar">{initial}</span>

                <div className="ride-recap-content">
                  <strong>{driverName}</strong>
                  <span>Chauffeur Taxi-Moto</span>
                </div>
              </div>

              <div className="ride-recap-total">
                <span>Prix payé</span>
                <strong>{fcfa(price)}</strong>
              </div>

              <p className="ride-recap-commission">
                Commission Taxi-Moto 7 % : {fcfa(commission)}
              </p>
            </section>

            {/* ===== NOTATION ===== */}
            <section className="ride-rating">
              <h2 className="ride-rating-title">Notez votre chauffeur</h2>

              <div className="ride-stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`ride-star ${value <= rating ? 'ride-star--on' : ''}`}
                    aria-label={`${value} étoiles`}
                    onClick={() => setRating(value)}
                  >
                    <Star size={34} />
                  </button>
                ))}
              </div>

              <textarea
                className="ride-comment"
                rows={3}
                placeholder="Un commentaire ? (optionnel)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </section>

            {/* ===== ACTIONS ===== */}
            <div className="ride-actions">
              <button type="button" className="ride-submit" onClick={submit}>
                <Star size={18} />
                Envoyer la note
              </button>

              <button type="button" className="ride-skip" onClick={skip}>
                Passer
              </button>
            </div>

          </>
        ) : onTrip ? (
          <>
            <section className="ride-active">
              <span className="ride-active-status">En cours</span>

              <strong className="ride-active-title">{info.label}</strong>

              <span className="ride-active-meta">
                {rideDestination} · {distanceKm} km
              </span>

              {selectedOffer && (
                <span className="ride-active-meta">
                  {fcfa(selectedOffer.price)} · {selectedOffer.driver.name}
                </span>
              )}

              <button type="button" className="ride-follow" onClick={follow}>
                Suivre ma course
                <ArrowRight size={18} />
              </button>
            </section>
          </>
        ) : (
          <>
            <section className="ride-empty">
              <span className="ride-empty-icon">
                <MapPinned size={30} strokeWidth={1.8} />
              </span>

              <strong>Aucune course en cours</strong>
              <p>Commandez une moto ou un tricycle quand vous voulez.</p>

              <button
                type="button"
                className="ride-empty-button"
                onClick={() => navigate('/passenger')}
              >
                Commander une course
              </button>
            </section>
          </>
        )}
      </div>
    </Page>
  );
}
