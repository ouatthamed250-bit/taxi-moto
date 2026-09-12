import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Power,
  Radar,
  Ruler,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { MapComponent } from '../../components/MapComponent';
import type { MapMarker } from '../../components/MapComponent';
import {
  ABIDJAN_CENTER,
  COLORS,
  MIN_FARE,
  VEHICLES,
  commissionOf,
  fcfa,
  netEarnings,
} from '../../theme';
import { useApp } from '../../store/useApp';
import { useGeolocation } from '../../hooks/useGeolocation';
import { MIN_MOVE_KM } from '../../services/geolocation';
import { DRIVER_STEPS, COURSE_LABEL, driverStepIndex } from '../../data/courseStatus';
import { coordsOfQuartier } from '../../data/quartiers';
import { callPhone, messagePhone, resolvePassengerPhone } from '../../services/contacts';
import './Dashboard.css';

/** Intervalle minimal entre deux publications de position (5 s). */
const PUBLISH_INTERVAL_MS = 5000;

export default function DriverDashboard() {
  const navigate = useNavigate();
  const {
    userName,
    driverOnline,
    toggleOnline,
    incomingRequest,
    acceptIncoming,
    rejectIncoming,
    driverRidesToday,
    driverRevenue,
    driverCommission,
    driverNet,
    driverBalance,
    phone,
    rechargeRequests,
    appSettings,
    setDriverPosition,
    activeRide,
    updateRideStatus,
    livePassengerPositions,
  } = useApp();
  const [fare, setFare] = useState(1500);

  /**
   * Publication de la position conducteur.
   * Filtrage assuré par le hook : 10 m minimum de déplacement ET 5 secondes
   * minimum entre deux publications (fini les sauts du GPS).
   */
  const geo = useGeolocation({
    minDistanceKm: MIN_MOVE_KM,
    minIntervalMs: PUBLISH_INTERVAL_MS,
    onUpdate: (position) => {
      setDriverPosition(position);
    },
  });

  const mapCenter: [number, number] = geo.position
    ? [geo.position.latitude, geo.position.longitude]
    : ABIDJAN_CENTER;

  const showGeoBanner = geo.permission !== 'granted' || Boolean(geo.error);

  const isLowBalance = driverBalance < appSettings.lowBalanceThreshold;

  const myDriverId = phone || 'driver-local';
  const pendingRecharges = rechargeRequests.filter(
    (request) => request.driverId === myDriverId && request.status === 'pending',
  );

  const handleRecharge = () => {
    navigate('/driver/recharge');
  };

  const handleAccept = () => {
    const lockedFare = Math.max(MIN_FARE, fare);
    const accepted = acceptIncoming(lockedFare);

    if (accepted) {
      alert(`Course acceptée à ${fcfa(lockedFare)} — prix verrouillé 🔒`);
    } else {
      alert(
        `Solde insuffisant pour accepter cette course.\n\nSolde actuel : ${fcfa(
          driverBalance,
        )}\nCommission requise : ${fcfa(
          commissionOf(lockedFare),
        )}\n\nRechargez votre solde pour continuer.`,
      );
    }
  };

  const info = VEHICLES[incomingRequest?.vehicle ?? 'moto'];

  /* ---- Suivi de course partagé (côté conducteur) ---- */
  const trip = activeRide;
  const tripStepIndex = trip ? Math.max(0, driverStepIndex(trip.status)) : 0;

  /** Position live du client à aller chercher (publiée sur la RTDB). */
  const clientPosition = trip?.passengerUid
    ? livePassengerPositions[trip.passengerUid]
    : undefined;

  /** Coordonnées du quartier de destination (si relevées sur le terrain). */
  const destinationCoords = coordsOfQuartier(trip?.destinationId);

  const tripMarkers: MapMarker[] = [];

  if (clientPosition) {
    tripMarkers.push({
      id: 'trip-client',
      position: [clientPosition.latitude, clientPosition.longitude],
      emoji: '🧍',
      label: `${trip?.passengerName ?? 'Client'} · point de prise en charge`,
      color: COLORS.blue,
      badge: 'Client',
    });
  }

  if (destinationCoords) {
    tripMarkers.push({
      id: 'trip-destination',
      position: [destinationCoords.latitude, destinationCoords.longitude],
      emoji: '🏁',
      label: trip?.destination ?? 'Destination',
      color: COLORS.orange,
      badge: 'Destination',
    });
  }

  /* Numéro réel du client (compte authLocal) — vide = boutons masqués. */
  const passengerPhone = trip
    ? (trip.passengerPhone ??
      resolvePassengerPhone({ id: trip.passengerId, name: trip.passengerName }))
    : incomingRequest
      ? resolvePassengerPhone({
          id: incomingRequest.passengerId,
          name: incomingRequest.passengerName,
          phone: incomingRequest.passengerPhone,
        })
      : '';

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-dashboard-page">

        {/* ===== CARTE ===== */}
        <div className="driver-dashboard-map">
          <MapComponent
            center={mapCenter}
            meLabel="Votre position"
            markers={tripMarkers}
            routeFrom={
              geo.position
                ? [geo.position.latitude, geo.position.longitude]
                : null
            }
            routeTo={
              clientPosition
                ? [clientPosition.latitude, clientPosition.longitude]
                : null
            }
          />

          <header className="driver-dashboard-topbar">
            <div className="driver-dashboard-brand">
              <div className="driver-dashboard-logo" aria-hidden="true">
                <div className="driver-dashboard-logo-pin">
                  <Radar size={14} strokeWidth={2.6} />
                </div>
                <div className="driver-dashboard-logo-wheel driver-dashboard-logo-wheel--one" />
                <div className="driver-dashboard-logo-wheel driver-dashboard-logo-wheel--two" />
              </div>

              <div className="driver-dashboard-brand-text">
                <span className="driver-dashboard-eyebrow">Taxi Moto</span>
                <strong className="driver-dashboard-name">
                  {userName || 'Conducteur'}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="driver-dashboard-profile"
              aria-label="Mon profil"
              onClick={() => navigate('/driver/profile')}
            >
              <UserRound size={19} />
            </button>
          </header>
        </div>

        {/* ===== BANDEAU GÉOLOCALISATION ===== */}
        {showGeoBanner && (
          <div className="geo-banner">
            <span className="geo-banner-icon">
              <MapPin size={18} />
            </span>

            <span className="geo-banner-text">
              {geo.supported
                ? 'Activez la géolocalisation pour recevoir des courses proches'
                : 'Géolocalisation non supportée par ce navigateur'}
            </span>

            {geo.supported && (
              <button
                type="button"
                className="geo-banner-btn"
                onClick={() => {
                  void geo.requestPermission();
                }}
              >
                Activer
              </button>
            )}
          </div>
        )}

        {/* ===== FEUILLE ===== */}
        <section className="driver-dashboard-sheet">

          {/* Statut en ligne / hors ligne */}
          <button
            type="button"
            className={`driver-dashboard-status ${
              driverOnline
                ? 'driver-dashboard-status--online'
                : 'driver-dashboard-status--offline'
            }`}
            onClick={toggleOnline}
          >
            <span className="driver-dashboard-status-dot" />

            <span className="driver-dashboard-status-text">
              <strong>
                {driverOnline ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
              </strong>
              <small>
                {driverOnline
                  ? 'Vous recevez les demandes près de vous'
                  : 'Passez en ligne pour recevoir des courses'}
              </small>
            </span>

            <span className="driver-dashboard-status-action">
              <Power size={13} />
              {driverOnline ? 'Hors ligne' : 'En ligne'}
            </span>
          </button>

          {/* Solde virtuel du conducteur */}
          <section
            className={`driver-dashboard-balance${
              isLowBalance ? ' driver-dashboard-balance--low' : ''
            }`}
          >
            <div className="driver-dashboard-balance-head">
              <span className="driver-dashboard-balance-icon">
                <Wallet size={16} />
              </span>
              <span className="driver-dashboard-balance-label">Mon solde</span>
            </div>

            <div className="driver-dashboard-balance-body">
              <strong className="driver-dashboard-balance-amount">{fcfa(driverBalance)}</strong>
              <span className="driver-dashboard-balance-hint">Débité à chaque course (10%)</span>
            </div>

            <button
              type="button"
              className="driver-dashboard-balance-recharge"
              onClick={handleRecharge}
            >
              <Plus size={14} />
              Recharger
            </button>
          </section>

          {isLowBalance && (
            <div className="driver-dashboard-balance-alert" role="alert">
              <AlertTriangle size={15} />
              Solde faible, pensez à recharger
            </div>
          )}

          {/* Demandes de recharge en attente de validation */}
          {pendingRecharges.length > 0 && (
            <section className="driver-dashboard-recharges">
              <div className="driver-dashboard-recharges-head">
                <span>Demandes de recharge en attente</span>
                <strong>{pendingRecharges.length}</strong>
              </div>

              {pendingRecharges.map((request) => (
                <div key={request.id} className="driver-dashboard-recharge">
                  <span className="driver-dashboard-recharge-icon">
                    <Clock size={15} />
                  </span>

                  <div className="driver-dashboard-recharge-info">
                    <strong>{fcfa(request.amount)}</strong>
                    <span>
                      {request.method} · {request.phone}
                    </span>
                  </div>

                  <span className="driver-dashboard-recharge-badge">En attente</span>
                </div>
              ))}
            </section>
          )}

          {/* Gains du jour */}
          <section className="driver-dashboard-earnings">
            <div className="driver-dashboard-earnings-head">
              <span className="driver-dashboard-earnings-icon">
                <Wallet size={16} />
              </span>
              <span className="driver-dashboard-earnings-title">Gains du jour</span>
            </div>

            <div className="driver-dashboard-earnings-grid">
              <div className="driver-dashboard-stat">
                <strong>{driverRidesToday.length}</strong>
                <span>Courses</span>
              </div>

              <div className="driver-dashboard-stat">
                <strong>{fcfa(driverRevenue)}</strong>
                <span>Bruts</span>
              </div>

              <div className="driver-dashboard-stat driver-dashboard-stat--net">
                <strong>{fcfa(driverNet)}</strong>
                <span>Net</span>
              </div>
            </div>

            <p className="driver-dashboard-commission">
              Commission plateforme (10 %) : {fcfa(driverCommission)}
            </p>
          </section>

          {/* ===== COURSE EN COURS (statut partagé avec le client) ===== */}
          {trip ? (
            <section className="driver-dashboard-trip">
              <div className="driver-dashboard-trip-head">
                <span className="driver-dashboard-trip-badge">
                  {COURSE_LABEL[trip.status]}
                </span>

                <span className="driver-dashboard-request-people">
                  <UsersRound size={13} />
                  {trip.passengerName ?? 'Client'}
                </span>
              </div>

              <strong className="driver-dashboard-request-title">
                {VEHICLES[trip.vehicle].emoji} {VEHICLES[trip.vehicle].label} ·{' '}
                {fcfa(trip.price)}
              </strong>

              <div className="driver-dashboard-rows">
                <div className="driver-dashboard-row">
                  <span className="driver-dashboard-row-icon driver-dashboard-row-icon--pickup">
                    <Navigation size={15} />
                  </span>
                  <span className="driver-dashboard-row-text">
                    {trip.pickup}
                    {clientPosition ? ' · position live' : ''}
                  </span>
                </div>

                <div className="driver-dashboard-row">
                  <span className="driver-dashboard-row-icon driver-dashboard-row-icon--dest">
                    <MapPin size={15} />
                  </span>
                  <span className="driver-dashboard-row-text">
                    Vers {trip.destination}
                  </span>
                </div>
              </div>

              {passengerPhone && (
                <div className="driver-dashboard-contact">
                  <button
                    type="button"
                    className="driver-dashboard-contact-btn driver-dashboard-contact-btn--call"
                    onClick={() => callPhone(passengerPhone)}
                  >
                    <Phone size={15} />
                    Appeler le client
                  </button>

                  <button
                    type="button"
                    className="driver-dashboard-contact-btn driver-dashboard-contact-btn--msg"
                    onClick={() => messagePhone(passengerPhone)}
                  >
                    <MessageCircle size={15} />
                    Message
                  </button>
                </div>
              )}

              {/* Étapes : gros boutons 3D, dans l'ordre logique de la course. */}
              <div className="driver-dashboard-steps">
                {DRIVER_STEPS.map((step, index) => {
                  const done = index < tripStepIndex;
                  const current = index === tripStepIndex;

                  return (
                    <button
                      key={step.status}
                      type="button"
                      className={`driver-dashboard-step${
                        done ? ' driver-dashboard-step--done' : ''
                      }${current ? ' driver-dashboard-step--current' : ''}`}
                      disabled={!current}
                      onClick={() => {
                        void updateRideStatus(trip.id, step.status);
                      }}
                    >
                      <span className="driver-dashboard-step-index">
                        {done ? <Check size={14} /> : index + 1}
                      </span>
                      {step.label}
                    </button>
                  );
                })}
              </div>

              <p className="driver-dashboard-trip-note">
                Chaque étape est visible en direct par le client dans son application.
              </p>
            </section>
          ) : incomingRequest ? (
            <section className="driver-dashboard-request">
              <div className="driver-dashboard-request-head">
                <span className="driver-dashboard-request-badge">Nouvelle demande</span>
                <span className="driver-dashboard-request-people">
                  <UsersRound size={13} />
                  {incomingRequest.passengers} passagers
                </span>
              </div>

              <strong className="driver-dashboard-request-title">
                {info.emoji} {info.label}
              </strong>

              <div className="driver-dashboard-rows">
                <div className="driver-dashboard-row">
                  <span className="driver-dashboard-row-icon driver-dashboard-row-icon--pickup">
                    <Navigation size={15} />
                  </span>
                  <span className="driver-dashboard-row-text">{incomingRequest.pickup}</span>
                </div>

                <div className="driver-dashboard-row">
                  <span className="driver-dashboard-row-icon driver-dashboard-row-icon--dest">
                    <MapPin size={15} />
                  </span>
                  <span className="driver-dashboard-row-text">
                    {incomingRequest.destination}
                  </span>
                </div>

                <div className="driver-dashboard-row">
                  <span className="driver-dashboard-row-icon driver-dashboard-row-icon--distance">
                    <Ruler size={15} />
                  </span>
                  <span className="driver-dashboard-row-text">
                    {incomingRequest.distanceKm} km estimés
                  </span>
                </div>
              </div>

              {incomingRequest.destinationLibre && (
                <p className="driver-dashboard-negotiate">
                  <Info size={13} />
                  Destination hors base — appelez le client pour confirmer le lieu et
                  négocier le prix.
                </p>
              )}

              {passengerPhone && (
                <div className="driver-dashboard-contact">
                  <button
                    type="button"
                    className="driver-dashboard-contact-btn driver-dashboard-contact-btn--call"
                    onClick={() => callPhone(passengerPhone)}
                  >
                    <Phone size={15} />
                    Appeler le client
                  </button>

                  <button
                    type="button"
                    className="driver-dashboard-contact-btn driver-dashboard-contact-btn--msg"
                    onClick={() => messagePhone(passengerPhone)}
                  >
                    <MessageCircle size={15} />
                    Message
                  </button>
                </div>
              )}

              <p className="driver-dashboard-fare-label">Proposez votre tarif</p>

              <div className="driver-dashboard-fare">
                <button
                  type="button"
                  className="driver-dashboard-fare-btn"
                  aria-label="Diminuer le tarif"
                  onClick={() => setFare((value) => Math.max(MIN_FARE, value - 100))}
                >
                  −
                </button>

                <input
                  type="number"
                  className="driver-dashboard-fare-input"
                  value={fare}
                  min={MIN_FARE}
                  onChange={(event) => setFare(Number(event.target.value))}
                />

                <button
                  type="button"
                  className="driver-dashboard-fare-btn"
                  aria-label="Augmenter le tarif"
                  onClick={() => setFare((value) => value + 100)}
                >
                  +
                </button>
              </div>

              <p className="driver-dashboard-net">
                Prix client : <strong>{fcfa(fare)}</strong> · Commission 10 % (
                {fcfa(commissionOf(fare))}) = Net :{' '}
                <strong className="driver-dashboard-net-value">{fcfa(netEarnings(fare))}</strong>
              </p>

              <div className="driver-dashboard-actions">
                <button
                  type="button"
                  className="driver-dashboard-accept"
                  onClick={handleAccept}
                >
                  <Check size={17} />
                  Accepter
                </button>

                <button
                  type="button"
                  className="driver-dashboard-refuse"
                  onClick={rejectIncoming}
                >
                  <X size={16} />
                  Refuser
                </button>
              </div>
            </section>
          ) : (
            <section className="driver-dashboard-waiting">
              <span className="driver-dashboard-waiting-icon">
                <Radar size={26} strokeWidth={2} />
              </span>

              <strong>En attente de courses…</strong>
              <p>
                {driverOnline
                  ? 'Restez en ligne, une demande arrive bientôt.'
                  : 'Passez en ligne pour recevoir des courses.'}
              </p>
            </section>
          )}

          {/* Courses du jour */}
          {driverRidesToday.length > 0 && (
            <section className="driver-dashboard-rides">
              <div className="driver-dashboard-rides-head">
                <span>Courses du jour</span>
                <strong>{driverRidesToday.length}</strong>
              </div>

              {driverRidesToday.slice(0, 3).map((ride) => (
                <div key={ride.id} className="driver-dashboard-ride">
                  <span className="driver-dashboard-ride-avatar">
                    {ride.passengerName.trim().charAt(0).toUpperCase() || 'P'}
                  </span>

                  <div className="driver-dashboard-ride-info">
                    <strong>{ride.destination}</strong>
                    <span>
                      {ride.time} · {VEHICLES[ride.vehicle].label} · {ride.distanceKm} km
                    </span>
                  </div>

                  <span className="driver-dashboard-ride-price">{fcfa(ride.price)}</span>
                </div>
              ))}
            </section>
          )}

        </section>
      </div>
    </Page>
  );
}
