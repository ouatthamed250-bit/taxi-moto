import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Clock,
  Handshake,
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
  MAX_FARE,
  MIN_FARE,
  VEHICLES,
  clampFare,
  commissionOf,
  estimateFare,
  fcfa,
  netEarnings,
} from '../../theme';
import { useApp } from '../../store/useApp';
import { useGeolocation } from '../../hooks/useGeolocation';
import { MIN_MOVE_KM, distanceBetween, NEAR_DISTANCE_METERS, ARRIVED_DISTANCE_METERS } from '../../services/geolocation';
import { DRIVER_STEPS, COURSE_LABEL, driverStepIndex } from '../../data/courseStatus';
import { describeRounds, roundLabel, canDriverCounter } from '../../data/negotiation';
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
    accountId,
    myOffer,
    proposePrice,
    acceptOffer,
    driverCounterOffer,
    offerNotice,
  } = useApp();
  const [fareAdjust, setFareAdjust] = useState<{ id: string; delta: number }>({
    id: '',
    delta: 0,
  });
  /** Modale de contre-proposition (négociation). */
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState(MIN_FARE);
  /** Envoi en cours + erreur éventuelle (l'envoi est confirmé par la RTDB). */
  const [counterSending, setCounterSending] = useState(false);
  const [counterError, setCounterError] = useState('');

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

  /* ---- Prix conseillé (barème unique — aucun prix en dur) ---- */
  const fareEstimate = estimateFare(incomingRequest?.distanceKm ?? 0);

  /**
   * Ajustement manuel du conducteur, mémorisé PAR demande (`id`) : dès qu'une
   * nouvelle demande arrive, le prix conseillé est réappliqué automatiquement.
   */
  const fareDelta =
    fareAdjust.id === (incomingRequest?.id ?? '') ? fareAdjust.delta : 0;
  const fare = clampFare(fareEstimate.exact + fareDelta);
  const fareOutOfRange = fare < fareEstimate.min || fare > fareEstimate.max;

  /* ---- Négociation en cours (offre publiée par ce conducteur) ---- */
  const offerRounds = myOffer?.rounds ?? [];
  const lastOfferRound = offerRounds[offerRounds.length - 1];
  /** C'est au conducteur de répondre (dernier message = client). */
  const mustAnswer = lastOfferRound?.from === 'passenger';
  /** Reste-t-il des tours de négociation côté chauffeur ? (3 contre-offres max) */
  const canCounterNow = canDriverCounter(offerRounds);

  /** Fixe le prix proposé (borné au barème 1 000 – 3 000 F). */
  const changeFare = (next: number) => {
    setFareAdjust({
      id: incomingRequest?.id ?? '',
      delta: clampFare(next) - fareEstimate.exact,
    });
  };

  /**
   * Ouvre la modale « Contre-proposer » : prix pré-rempli = prix du client
   * + 100 F (borné 1 000 – 3 000 F par `clampFare`).
   */
  const openDriverCounter = () => {
    if (!myOffer) return;

    const next = clampFare(myOffer.price + 100);
    setCounterAmount(next);
    setCounterError('');
    setCounterOpen(true);

    console.log('[driver] contre-proposer cliqué', next);
  };

  /** Envoie la contre-proposition (ferme la modale seulement si la RTDB a répondu). */
  const sendDriverCounter = async () => {
    if (!myOffer) return;

    const amount = clampFare(counterAmount);
    console.log('[driver] envoi de la contre-proposition', amount);

    setCounterSending(true);
    setCounterError('');

    const ok = await driverCounterOffer(myOffer.id, amount);

    setCounterSending(false);
    console.log('[driver] résultat :', ok ? 'OK' : 'ÉCHEC');

    if (!ok) {
      setCounterError('Envoi impossible — vérifiez votre connexion et réessayez.');
      return;
    }

    setCounterOpen(false);
  };

  const myDriverId = accountId || phone || 'driver-local';
  const pendingRecharges = rechargeRequests.filter(
    (request) =>
      (request.driverId === accountId ||
        request.driverId === phone ||
        request.driverId === myDriverId) &&
      request.status === 'pending',
  );

  const handleRecharge = () => {
    navigate('/driver/recharge');
  };

  const handleAccept = () => {
    const lockedFare = clampFare(fare);
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

  /* ---- Suivi GPS RÉEL : le point de rendez-vous EST le client ---- */
  const trip = activeRide;
  const tripStepIndex = trip ? Math.max(0, driverStepIndex(trip.status)) : 0;

  /** uid du client à localiser : course en cours OU demande reçue. */
  const clientUid = trip?.passengerUid ?? incomingRequest?.passengerId;
  /** Position live du client (publiée sur la RTDB) — jamais un point fixe. */
  const clientPosition = clientUid ? livePassengerPositions[clientUid] : undefined;
  const clientName = trip?.passengerName ?? incomingRequest?.passengerName ?? 'Client';
  /** Quartier choisi par le client : contexte (négociation/historique), pas une position. */
  const clientQuartier = trip?.destination ?? incomingRequest?.destination ?? '—';

  /** Distance RÉELLE (mètres) entre le conducteur et le client. */
  const clientDistanceMeters = distanceBetween(geo.position, clientPosition);
  const clientIsNear =
    clientDistanceMeters !== null && clientDistanceMeters < NEAR_DISTANCE_METERS;
  const clientArrived =
    clientDistanceMeters !== null && clientDistanceMeters < ARRIVED_DISTANCE_METERS;

  /** Phase de prise en charge : avant le démarrage de la course. */
  const pickingUp = trip?.status === 'accepted' || trip?.status === 'arrived';

  const tripMarkers: MapMarker[] = [];

  if (clientPosition) {
    tripMarkers.push({
      id: 'trip-client',
      position: [clientPosition.latitude, clientPosition.longitude],
      emoji: '🧍',
      label: `${clientName} · ${clientQuartier}`,
      color: COLORS.blue,
      badge:
        clientDistanceMeters !== null
          ? `Client à ${Math.round(clientDistanceMeters)} m`
          : 'Client',
      pulse: pickingUp && clientIsNear,
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

          {/* Qui va où : le client est localisé EN DIRECT (aucun point fixe) */}
          {clientPosition && (
            <div className="driver-dashboard-map-chip">
              <MapPin size={13} />
              Client à {clientQuartier}
              {clientDistanceMeters !== null && (
                <strong> · {Math.round(clientDistanceMeters)} m</strong>
              )}
            </div>
          )}

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

          {/* Information négociation (expiration / solde insuffisant) */}
          {offerNotice && (
            <p className="driver-dashboard-negotiate">
              <Info size={13} />
              {offerNotice}
            </p>
          )}

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

              {/* ===== ARRIVÉE CHEZ LE CLIENT (≤ 30 m) ===== */}
              {pickingUp && clientArrived && (
                <>
                  <p className="driver-dashboard-arrival">
                    🚗 Vous êtes arrivé chez le client. Appelez-le si besoin.
                  </p>

                  {trip.status === 'accepted' && (
                    <button
                      type="button"
                      className="driver-dashboard-arrived-cta"
                      onClick={() => {
                        void updateRideStatus(trip.id, 'arrived');
                      }}
                    >
                      <MapPin size={17} />
                      Je suis arrivé
                    </button>
                  )}
                </>
              )}

              {/* Étapes : gros boutons 3D pilotés par le CONDUCTEUR.
                  On peut confirmer l'étape en cours ou passer à la SUIVANTE. */}
              <div className="driver-dashboard-steps">
                {DRIVER_STEPS.map((step, index) => {
                  const done = index < tripStepIndex;
                  const current = index === tripStepIndex;
                  /** L'étape SUIVANTE est cliquable → le conducteur avance. */
                  const isNext = index === tripStepIndex + 1;

                  return (
                    <button
                      key={step.status}
                      type="button"
                      className={`driver-dashboard-step${
                        done ? ' driver-dashboard-step--done' : ''
                      }${current ? ' driver-dashboard-step--current' : ''}${
                        isNext ? ' driver-dashboard-step--next' : ''
                      }`}
                      disabled={!current && !isNext}
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
                Vous seul faites évoluer la course : chaque étape s’affiche en direct chez le
                client (il ne peut qu’annuler avant le départ).
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

              <p className="driver-dashboard-fare-label">
                Prix conseillé : <strong>{fcfa(fareEstimate.exact)}</strong> (fourchette{' '}
                {fcfa(fareEstimate.min)} – {fcfa(fareEstimate.max)})
              </p>

              <div className="driver-dashboard-fare">
                <button
                  type="button"
                  className="driver-dashboard-fare-btn"
                  aria-label="Diminuer le tarif"
                  onClick={() => changeFare(fare - 100)}
                >
                  −
                </button>

                <input
                  type="number"
                  className="driver-dashboard-fare-input"
                  value={fare}
                  min={MIN_FARE}
                  max={MAX_FARE}
                  step={100}
                  onChange={(event) => changeFare(Number(event.target.value))}
                />

                <button
                  type="button"
                  className="driver-dashboard-fare-btn"
                  aria-label="Augmenter le tarif"
                  onClick={() => changeFare(fare + 100)}
                >
                  +
                </button>
              </div>

              {fareOutOfRange && (
                <p className="driver-dashboard-fare-hint">
                  Hors fourchette conseillée — justifiez ce prix auprès du client
                  (négociation).
                </p>
              )}

              <p className="driver-dashboard-net">
                Prix client : <strong>{fcfa(fare)}</strong> · Commission 10 % (
                {fcfa(commissionOf(fare))}) = Net :{' '}
                <strong className="driver-dashboard-net-value">{fcfa(netEarnings(fare))}</strong>
              </p>

              {myOffer ? (
                /* ---- Négociation en cours : offre publiée par ce conducteur ---- */
                <section className="driver-dashboard-counter">
                  <div className="driver-dashboard-trip-head">
                    <span className="driver-dashboard-trip-badge">
                      {myOffer.status === 'accepted'
                        ? 'Prix accepté'
                        : myOffer.status === 'negotiating'
                          ? `Contre-offre du client — ${roundLabel(offerRounds)}`
                          : `Offre envoyée — ${roundLabel(offerRounds)}`}
                    </span>

                    <span className="driver-dashboard-request-people">
                      <Wallet size={13} />
                      {fcfa(myOffer.price)}
                    </span>
                  </div>

                  <ul className="driver-dashboard-nego">
                    {describeRounds(offerRounds, fcfa, 'driver').map((line) => (
                      <li key={line} className="driver-dashboard-nego-line">
                        {line}
                      </li>
                    ))}
                  </ul>

                  {mustAnswer ? (
                    <>
                      <p className="driver-dashboard-nego-waiting">
                        Le client propose {fcfa(myOffer.price)} — répondez sous 60 s,
                        sinon la course part chez un autre conducteur.
                      </p>

                      <div className="driver-dashboard-actions">
                        <button
                          type="button"
                          className="driver-dashboard-accept"
                          onClick={() => acceptOffer(myOffer.id)}
                        >
                          <Check size={17} />
                          Accepter {fcfa(myOffer.price)}
                        </button>

                        <button
                          type="button"
                          className="driver-dashboard-counter-btn"
                          onClick={openDriverCounter}
                          disabled={!canCounterNow}
                        >
                          <Handshake size={16} />
                          {canCounterNow ? 'Contre-proposer' : '3 tours atteints'}
                        </button>
                      </div>

                      {!canCounterNow && (
                        <p className="driver-dashboard-nego-waiting">
                          Limite de 3 tours atteinte — acceptez le prix du client ou
                          refusez la course.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="driver-dashboard-nego-waiting">
                      En attente de la réponse du client…
                    </p>
                  )}

                  {/* Le conducteur peut TOUJOURS se retirer (refus publié). */}
                  <button
                    type="button"
                    className="driver-dashboard-refuse"
                    onClick={rejectIncoming}
                  >
                    <X size={16} />
                    Refuser
                  </button>
                </section>
              ) : (
                <div className="driver-dashboard-actions">
                  <button
                    type="button"
                    className="driver-dashboard-accept"
                    onClick={() => proposePrice(fare)}
                  >
                    <Handshake size={17} />
                    Proposer {fcfa(fare)}
                  </button>

                  <button
                    type="button"
                    className="driver-dashboard-accept"
                    onClick={handleAccept}
                  >
                    <Check size={17} />
                    Accord direct
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
              )}
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
      {/* ===== MODALE : CONTRE-PROPOSITION DU CONDUCTEUR ===== */}
      {counterOpen && myOffer && (
        <div className="driver-counter-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="driver-counter-backdrop"
            aria-label="Fermer"
            onClick={() => setCounterOpen(false)}
          />

          <div className="driver-counter-card">
            <h2 className="driver-counter-title">Contre-proposer</h2>

            <p className="driver-counter-sub">
              Le client propose {fcfa(lastOfferRound?.amount ?? myOffer.price)} —{' '}
              {roundLabel(offerRounds)}. Votre contre-proposition :
            </p>

            <div className="driver-dashboard-fare">
              <button
                type="button"
                className="driver-dashboard-fare-btn"
                aria-label="Diminuer de 100"
                onClick={() => setCounterAmount((value) => clampFare(value - 100))}
              >
                −
              </button>

              <input
                type="number"
                className="driver-dashboard-fare-input"
                value={counterAmount}
                min={MIN_FARE}
                max={MAX_FARE}
                step={100}
                inputMode="numeric"
                aria-label="Votre prix"
                onChange={(event) => {
                  /*
                   * SAISIE LIBRE : on ne borne PAS à chaque frappe (sinon
                   * impossible de taper « 1400 » : chaque chiffre était ramené
                   * à 1 000). Le prix est borné à 1 000 – 3 000 F à l'envoi.
                   */
                  const next = Number(event.target.value);
                  setCounterAmount(Number.isFinite(next) ? next : MIN_FARE);
                }}
                onBlur={() => setCounterAmount((value) => clampFare(value))}
              />
              <span className="driver-dashboard-fare-unit">F</span>

              <button
                type="button"
                className="driver-dashboard-fare-btn"
                aria-label="Augmenter de 100"
                onClick={() => setCounterAmount((value) => clampFare(value + 100))}
              >
                +
              </button>
            </div>

            <p className="driver-dashboard-net">
              Commission 10 % ({fcfa(commissionOf(clampFare(counterAmount)))}) = Net :{' '}
              <strong className="driver-dashboard-net-value">
                {fcfa(netEarnings(clampFare(counterAmount)))}
              </strong>
            </p>

            {counterError && (
              <p className="driver-counter-error" role="alert">
                {counterError}
              </p>
            )}

            <button
              type="button"
              className="driver-counter-send"
              onClick={() => {
                void sendDriverCounter();
              }}
              disabled={counterSending}
            >
              <Handshake size={16} />
              {counterSending ? 'Envoi…' : 'Envoyer ma contre-proposition'}
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}
