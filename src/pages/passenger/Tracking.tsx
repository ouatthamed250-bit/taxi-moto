import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageCircle,
  Phone,
  Radar,
  Star,
  X,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { MapComponent } from '../../components/MapComponent';
import type { MapMarker } from '../../components/MapComponent';
import { ABIDJAN_CENTER, COLORS, VEHICLES, commissionOf, fcfa, netEarnings } from '../../theme';
import { useApp } from '../../store/useApp';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getDistanceKm } from '../../services/geolocation';
import './Tracking.css';

const LIVE_DRIVER_COLOR = '#009E60';

const STATUS_LABEL: Record<string, string> = {
  driver_found: 'Chauffeur en route',
  driver_arriving: 'Chauffeur en route',
  driver_arrived: 'Chauffeur arrivé',
  in_progress: 'Course en cours',
  completed: 'Terminée',
};

const STATUS_TONE: Record<string, 'blue' | 'orange' | 'green'> = {
  driver_found: 'blue',
  driver_arriving: 'blue',
  driver_arrived: 'orange',
  in_progress: 'orange',
  completed: 'green',
};

const STEPS = ['En route', 'Arrivé', 'En cours', 'Terminé'];

const STEP_INDEX: Record<string, number> = {
  driver_found: 0,
  driver_arriving: 0,
  driver_arrived: 1,
  in_progress: 2,
  completed: 3,
};

export default function Tracking() {
  const navigate = useNavigate();
  const {
    selectedOffer,
    rideStatus,
    advanceRide,
    cancelRide,
    rateRide,
    resetBooking,
    vehicle,
    destination,
    driverPosition,
    setPassengerPosition,
  } = useApp();
  const [rating, setRating] = useState(0);

  /* Géolocalisation réelle du client (watch continu). */
  const geo = useGeolocation({ onUpdate: (position) => setPassengerPosition(position) });

  useEffect(() => {
    if (!selectedOffer) navigate('/passenger');
  }, [selectedOffer, navigate]);

  if (!selectedOffer) return null;

  const driver = selectedOffer.driver;
  const vehicleKey = vehicle ?? driver.vehicle;
  const info = VEHICLES[vehicleKey];
  const completed = rideStatus === 'completed';
  const tone = STATUS_TONE[rideStatus] ?? 'blue';
  const stepIndex = STEP_INDEX[rideStatus] ?? 0;
  const initial = driver.name.trim().charAt(0).toUpperCase() || 'C';

  const driverPin: [number, number] = [ABIDJAN_CENTER[0] + 0.006, ABIDJAN_CENTER[1] + 0.007];
  const destinationPin: [number, number] = [
    ABIDJAN_CENTER[0] - 0.008,
    ABIDJAN_CENTER[1] - 0.006,
  ];

  /* Positions live : le client suit sa position, le conducteur est lu du store. */
  const passengerPin: [number, number] = geo.position
    ? [geo.position.latitude, geo.position.longitude]
    : ABIDJAN_CENTER;

  const liveDriverPin: [number, number] = driverPosition
    ? [driverPosition.latitude, driverPosition.longitude]
    : driverPin;

  const remainingKm =
    driverPosition && geo.position
      ? getDistanceKm(
          geo.position.latitude,
          geo.position.longitude,
          driverPosition.latitude,
          driverPosition.longitude,
        )
      : null;

  const markers: MapMarker[] = [
    {
      id: driver.id,
      position: liveDriverPin,
      emoji: info.emoji,
      label: `${driver.name} · ${driver.plate}`,
      color: driverPosition ? LIVE_DRIVER_COLOR : COLORS.navy,
      badge: driverPosition ? 'Position live' : undefined,
    },
    {
      id: 'destination',
      position: destinationPin,
      emoji: '🏁',
      label: destination || 'Destination',
      color: COLORS.orange,
    },
  ];

  const finish = () => {
    if (rating > 0) rateRide(rating);
    resetBooking();
    navigate('/passenger/ride');
  };

  const cancel = () => {
    cancelRide();
    navigate('/passenger');
  };

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="tracking-page">

        {/* ===== CARTE ===== */}
        <div className="tracking-map">
          <MapComponent center={passengerPin} markers={markers} />

          <header className="tracking-topbar">
            <button
              type="button"
              className="tracking-back"
              aria-label="Retour"
              onClick={cancel}
            >
              <ArrowLeft size={20} />
            </button>

            <div className="tracking-brand">
              <div className="tracking-logo" aria-hidden="true">
                <div className="tracking-logo-pin">
                  <Radar size={14} strokeWidth={2.6} />
                </div>
                <div className="tracking-logo-wheel tracking-logo-wheel--one" />
                <div className="tracking-logo-wheel tracking-logo-wheel--two" />
              </div>
              <span className="tracking-brand-text">Taxi Moto</span>
            </div>
          </header>
        </div>

        {/* ===== CONTENU ===== */}
        <section className="tracking-content">
          <span className="tracking-orb tracking-orb--orange" />
          <span className="tracking-orb tracking-orb--blue" />

          {/* Statut */}
          <div className={`tracking-status tracking-status--${tone}`}>
            <span className="tracking-status-dot" />
            {STATUS_LABEL[rideStatus] ?? 'Course'}
          </div>

          {remainingKm !== null && (
            <p className="tracking-live-distance">
              <Radar size={14} />
              Conducteur à {remainingKm} km de vous
            </p>
          )}

          {/* Chauffeur */}
          <article className="tracking-driver">
            <div className="tracking-driver-head">
              <span className="tracking-avatar">{initial}</span>

              <div className="tracking-driver-id">
                <strong className="tracking-driver-name">{driver.name}</strong>

                <span className="tracking-driver-rating">
                  <Star size={12} fill="currentColor" />
                  {driver.rating}
                  <span className="tracking-driver-sep">·</span>
                  {driver.rides} courses
                </span>

                <span className="tracking-driver-vehicle">
                  {info.label} · {driver.plate}
                </span>
              </div>

              <div className="tracking-price">
                <strong>{fcfa(selectedOffer.price)}</strong>
                <span>prix verrouillé</span>
              </div>
            </div>

            <p className="tracking-net">
              Commission 10 % ({fcfa(commissionOf(selectedOffer.price))}) · Net chauffeur :{' '}
              {fcfa(netEarnings(selectedOffer.price))}
            </p>

            <div className="tracking-actions">
              <button
                type="button"
                className="tracking-action tracking-action--call"
                onClick={() => alert(`Appel de ${driver.name}…`)}
              >
                <Phone size={17} />
                Appeler
              </button>

              <button
                type="button"
                className="tracking-action tracking-action--msg"
                onClick={() => alert(`Message à ${driver.name}…`)}
              >
                <MessageCircle size={17} />
                Message
              </button>
            </div>
          </article>


          {/* Progression */}
          <div className="tracking-progress">
            {STEPS.map((step, index) => {
              const done = index < stepIndex;
              const active = index === stepIndex;

              return (
                <div
                  key={step}
                  className={`tracking-step ${done ? 'tracking-step--done' : ''} ${
                    active ? 'tracking-step--active' : ''
                  }`}
                >
                  <span className="tracking-step-dot">
                    {done ? <Check size={13} /> : index + 1}
                  </span>
                  <span className="tracking-step-label">{step}</span>
                </div>
              );
            })}
          </div>

          {completed ? (
            <>
              <div className="tracking-rate">
                <span className="tracking-rate-title">Notez {driver.name}</span>

                <div className="tracking-rate-stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="tracking-star"
                      aria-label={`${value} étoiles`}
                      onClick={() => setRating(value)}
                    >
                      <Star
                        size={30}
                        color={COLORS.yellow}
                        fill={value <= rating ? COLORS.yellow : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="tracking-cta tracking-cta--green"
                onClick={finish}
              >
                <Star size={19} />
                Noter la course
              </button>
            </>
          ) : (
            <>
              {(rideStatus === 'driver_found' || rideStatus === 'driver_arriving') && (
                <button
                  type="button"
                  className="tracking-cta tracking-cta--blue"
                  onClick={() => alert(`Appel de ${driver.name}…`)}
                >
                  <Phone size={19} />
                  Contacter le chauffeur
                </button>
              )}

              {rideStatus === 'driver_arrived' && (
                <button
                  type="button"
                  className="tracking-cta tracking-cta--orange"
                  onClick={advanceRide}
                >
                  Je suis monté
                </button>
              )}

              {rideStatus === 'in_progress' && (
                <button type="button" className="tracking-cta tracking-cta--loading" disabled>
                  <Loader2 size={19} className="tracking-spin" />
                  Course en cours…
                </button>
              )}

              <div className="tracking-secondary">
                <button
                  type="button"
                  className="tracking-secondary-btn"
                  onClick={advanceRide}
                >
                  Étape suivante (simulation)
                </button>

                <button
                  type="button"
                  className="tracking-secondary-btn tracking-secondary-btn--danger"
                  onClick={cancel}
                >
                  <X size={15} />
                  Annuler la course
                </button>
              </div>
            </>
          )}

        </section>
      </div>
    </Page>
  );
}
