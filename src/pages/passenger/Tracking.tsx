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
import { useDriverLivePosition } from '../../hooks/useDriverLivePosition';
import {
  ARRIVED_DISTANCE_METERS,
  NEAR_DISTANCE_METERS,
  distanceBetween,
} from '../../services/geolocation';
import { getDistanceKm } from '../../services/geolocation';
import { callPhone, messagePhone, resolveDriverPhone } from '../../services/contacts';
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

  /* Position live du chauffeur (Firebase Realtime Database) → temps réel. */
  const liveDriver = useDriverLivePosition(selectedOffer?.driver.id);

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

  /* Numéro réel du chauffeur (compte authLocal) — vide = boutons masqués. */
  const driverPhone = resolveDriverPhone(driver);

  /* ---- Positions RÉELLES uniquement (aucune position inventée) ---- */
  const driverLivePosition = liveDriver ?? driverPosition;

  const passengerPin: [number, number] = geo.position
    ? [geo.position.latitude, geo.position.longitude]
    : ABIDJAN_CENTER;

  const liveDriverPin: [number, number] | null = driverLivePosition
    ? [driverLivePosition.latitude, driverLivePosition.longitude]
    : null;

  /*
   * Positions RÉELLES uniquement : la position du client (son propre GPS) et
   * celle du chauffeur (Realtime Database). Aucun marqueur de destination fixe :
   * dans la zone, les motos entrent à l'intérieur des quartiers et le client
   * est mobile → le point de rendez-vous EST la position du client.
   */
  const remainingKm =
    driverLivePosition && geo.position
      ? getDistanceKm(
          geo.position.latitude,
          geo.position.longitude,
          driverLivePosition.latitude,
          driverLivePosition.longitude,
        )
      : null;

  /** Distance RÉELLE restante en mètres (messages de proximité). */
  const remainingMeters = distanceBetween(driverLivePosition, geo.position);

  /** Estimation d'arrivée (≈ 20 km/h en ville), arrondie à la minute. */
  const etaMinutes =
    remainingMeters !== null
      ? Math.max(1, Math.round((remainingMeters / 1000 / 20) * 60))
      : null;

  /** Proximité du chauffeur (100 m = tout près, 30 m = sur place). */
  const driverIsNear = remainingMeters !== null && remainingMeters < NEAR_DISTANCE_METERS;
  const driverHasArrived =
    remainingMeters !== null && remainingMeters < ARRIVED_DISTANCE_METERS;

  /**
   * Phase de PRISE EN CHARGE : le chauffeur vient chercher le client.
   * (Une fois la course démarrée, les deux sont ensemble → plus d'alerte.)
   */
  const driverIsArriving =
    rideStatus === 'driver_found' ||
    rideStatus === 'driver_arriving' ||
    rideStatus === 'driver_arrived';

  /** Alerte « tout près / sur place » uniquement pendant la prise en charge. */
  const showNearAlert = driverIsArriving && driverIsNear;
  const showArrivalAlert = driverIsArriving && driverHasArrived;

  /** Message d'état TEMPS RÉEL (statut partagé + proximité GPS). */
  const liveMessage = driverIsArriving
    ? driverHasArrived
      ? `${driver.name} est arrivé, cherchez-le !`
      : driverIsNear
        ? `Le chauffeur est tout près !`
        : etaMinutes !== null
          ? `${driver.name} arrive dans ~${etaMinutes} min.`
          : `${driver.name} — chauffeur en route vers vous.`
    : rideStatus === 'in_progress'
      ? `En route vers ${destination || 'votre destination'}.`
      : rideStatus === 'completed'
        ? 'Vous êtes arrivé !'
        : rideStatus === 'cancelled'
          ? 'Course annulée.'
          : `${driver.name} — chauffeur en route vers vous.`;

  const markers: MapMarker[] = [];

  if (liveDriverPin) {
    markers.push({
      id: driver.id,
      position: liveDriverPin,
      emoji: info.emoji,
      label: `${driver.name} · ${driver.plate}`,
      color: LIVE_DRIVER_COLOR,
      badge:
        remainingMeters !== null
          ? `À ${Math.round(remainingMeters)} m`
          : 'Position live',
      distanceKm: remainingKm ?? undefined,
      pulse: showNearAlert,
    });
  }

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
          <MapComponent
            center={passengerPin}
            markers={markers}
            routeFrom={liveDriverPin}
            routeTo={passengerPin}
          />

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

          {/* Message d'état temps réel (statut partagé piloté par le chauffeur) */}
          <p className={`tracking-live-message tracking-live-message--${tone}`}>
            {liveMessage}
          </p>

          {/* ===== ALERTE D'ARRIVÉE : le chauffeur est sur place (≤ 30 m) ===== */}
          {showArrivalAlert && (
            <div className="tracking-arrival-banner" role="status">
              <span className="tracking-arrival-icon" aria-hidden="true">
                🚗
              </span>
              Le chauffeur est là ! Regardez autour de vous.
            </div>
          )}

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
              {driverPhone ? (
                <>
                  <button
                    type="button"
                    className="tracking-action tracking-action--call"
                    onClick={() => callPhone(driverPhone)}
                  >
                    <Phone size={17} />
                    Appeler
                  </button>

                  <button
                    type="button"
                    className="tracking-action tracking-action--msg"
                    onClick={() => messagePhone(driverPhone)}
                  >
                    <MessageCircle size={17} />
                    Message
                  </button>
                </>
              ) : (
                <span className="tracking-action-hint">
                  Numéro indisponible — la messagerie de la course reste active.
                </span>
              )}
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
                  onClick={() => callPhone(driverPhone)}
                  disabled={!driverPhone}
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
