import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Car,
  Check,
  Handshake,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Radar,
  RotateCcw,
  Search,
  Star,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { Page } from '../../components/Page';
import {
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
import {
  MAX_NEGOTIATION_ROUNDS,
  canNegotiate,
  describeRounds,
  roundLabel,
} from '../../data/negotiation';
import { callPhone, messagePhone, resolveDriverPhone } from '../../services/contacts';
import type { Offer, VehicleType } from '../../types';
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
    destinationLibre,
    cancelRide,
    rideStatus,
    negotiations,
    acceptOffer,
    rejectOffer,
    sendCounterOffer,
  } = useApp();

  // Fallback visuel si le visuel véhicule ne charge pas (badge + icône).
  const [vehicleImageBroken, setVehicleImageBroken] = useState(false);
  /** Offre en cours de négociation (modale ouverte). */
  const [negotiating, setNegotiating] = useState<Offer | null>(null);
  /** Prix proposé par le client dans la modale. */
  const [counterAmount, setCounterAmount] = useState(MIN_FARE);
  /** Contre-offre envoyée : en attente de la réponse du chauffeur. */
  const [waitingOfferId, setWaitingOfferId] = useState('');

  const vehicleKey: VehicleType = vehicle ?? 'moto';
  const info = VEHICLES[vehicleKey];
  const estimate = estimateFare(distanceKm);

  /** Accepte le prix proposé : il est VERROUILLÉ pour la course. */
  const accept = (id: string) => {
    const found = offers.find((offer) => offer.id === id);
    if (!found) return;
    chooseOffer(found);
    acceptOffer(id);
  };

  const openNegotiation = (offer: Offer) => {
    setNegotiating(offer);
    setCounterAmount(clampFare(offer.price - 100));
    setWaitingOfferId('');
  };

  const sendCounter = () => {
    if (!negotiating) return;
    sendCounterOffer(negotiating.id, counterAmount);
    setWaitingOfferId(negotiating.id);
    setNegotiating(null);
  };

  /* Le conducteur a créé la course → suivi en temps réel. */
  useEffect(() => {
    if (rideStatus === 'driver_found') navigate('/passenger/tracking');
  }, [rideStatus, navigate]);

  /*
   * Plus aucune offre (refus / expiration) : on laisse le temps à la
   * republication automatique avant de basculer sur l'écran « indisponible ».
   */
  useEffect(() => {
    if (offers.length > 0 || rideStatus === 'driver_found') return undefined;

    const timer = window.setTimeout(
      () => navigate('/passenger/unavailable', { state: { reason: 'no-driver' } }),
      2500,
    );
    return () => window.clearTimeout(timer);
  }, [offers, rideStatus, navigate]);

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

        {destinationLibre && (
          <p className="free-destination-note">
            <Info size={14} />
            Destination hors base — le chauffeur vous contactera pour confirmer
          </p>
        )}

        {/* ===== LISTE DES OFFRES ===== */}
        {offers.length === 0 ? (
          <section className="offers-empty">
            <span className="offers-empty-icon">
              <Search size={30} strokeWidth={1.8} />
            </span>

            <strong>Aucun accord pour l’instant</strong>
            <p>
              Les conducteurs n’ont pas encore répondu, ou la négociation a expiré :
              nous recherchons un autre chauffeur…
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
              // Numéro réel du conducteur (compte authLocal) — vide = boutons masqués.
              const driverPhone = resolveDriverPhone(driver);

              /* ---- Négociation en cours pour cette offre ---- */
              const negotiation = negotiations[offer.id] ?? offer.negotiation;
              const rounds = negotiation?.rounds ?? [];
              const isWaiting = waitingOfferId === offer.id;
              const canStillNegotiate = canNegotiate(rounds);

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
                    Commission 10 % ({fcfa(commissionOf(offer.price))}) · Net
                    chauffeur : {fcfa(netEarnings(offer.price))}
                  </p>

                  {driverPhone && (
                    <div className="offers-contact">
                      <button
                        type="button"
                        className="offers-contact-btn offers-contact-btn--call"
                        onClick={() => callPhone(driverPhone)}
                      >
                        <Phone size={16} />
                        Appeler
                      </button>

                      <button
                        type="button"
                        className="offers-contact-btn offers-contact-btn--msg"
                        onClick={() => messagePhone(driverPhone)}
                      >
                        <MessageCircle size={16} />
                        Message
                      </button>
                    </div>
                  )}

                  {/* ===== NÉGOCIATION (3 tours maximum) ===== */}
                  {rounds.length > 0 && (
                    <div className="offers-nego">
                      <div className="offers-nego-head">
                        <span className="offers-nego-round">{roundLabel(rounds)}</span>
                        <span className="offers-nego-status">
                          {negotiation?.status === 'accepted'
                            ? 'Prix accepté'
                            : isWaiting
                              ? 'En attente du chauffeur…'
                              : 'Négociation en cours'}
                        </span>
                      </div>

                      <ul className="offers-nego-history">
                        {describeRounds(rounds, fcfa).map((line) => (
                          <li key={line} className="offers-nego-line">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isWaiting && (
                    <p className="offers-nego-waiting">
                      En attente de la réponse du chauffeur…
                    </p>
                  )}

                  <div className="offers-choice">
                    <button
                      type="button"
                      className="offers-pick"
                      onClick={() => accept(offer.id)}
                    >
                      <Check size={16} />
                      Accepter {fcfa(offer.price)}
                    </button>

                    <button
                      type="button"
                      className="offers-nego-btn"
                      onClick={() => openNegotiation(offer)}
                      disabled={!canStillNegotiate}
                    >
                      <Handshake size={16} />
                      {canStillNegotiate ? 'Négocier' : '3 tours épuisés'}
                    </button>

                    <button
                      type="button"
                      className="offers-reject-btn"
                      onClick={() => rejectOffer(offer.id)}
                    >
                      <X size={15} />
                      Refuser
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}


        {/* ===== MODALE : NÉGOCIATION DU PRIX ===== */}
        {negotiating && (
          <div className="offers-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="offers-modal-backdrop"
              aria-label="Fermer"
              onClick={() => setNegotiating(null)}
            />

            <div className="offers-modal-card">
              <h2 className="offers-modal-title">Négocier le prix</h2>

              <p className="offers-modal-sub">
                {negotiating.driver.name} propose{' '}
                <strong>{fcfa(negotiating.price)}</strong>
              </p>

              {/* Progression des tours (1, 2, 3) */}
              <div className="offers-rounds">
                {Array.from({ length: MAX_NEGOTIATION_ROUNDS }).map((_, index) => {
                  const current = (negotiating.negotiation?.currentRound ?? 1) - 1;
                  const done = index < current;

                  return (
                    <span
                      key={index}
                      className={`offers-round-step${
                        done ? ' offers-round-step--done' : ''
                      }${index === current ? ' offers-round-step--current' : ''}`}
                    >
                      {index + 1}
                    </span>
                  );
                })}
              </div>

              <p className="offers-modal-round-label">
                {roundLabel(negotiating.negotiation?.rounds ?? [])}
              </p>

              <label className="offers-modal-label" htmlFor="offer-counter">
                Votre prix
              </label>

              <div className="offers-modal-fare">
                <button
                  type="button"
                  className="offers-modal-fare-btn"
                  aria-label="Diminuer de 100"
                  onClick={() => setCounterAmount((value) => clampFare(value - 100))}
                >
                  −
                </button>

                <input
                  id="offer-counter"
                  type="number"
                  className="offers-modal-fare-input"
                  value={counterAmount}
                  min={MIN_FARE}
                  max={MAX_FARE}
                  step={100}
                  onChange={(event) => setCounterAmount(clampFare(Number(event.target.value)))}
                />

                <button
                  type="button"
                  className="offers-modal-fare-btn"
                  aria-label="Augmenter de 100"
                  onClick={() => setCounterAmount((value) => clampFare(value + 100))}
                >
                  +
                </button>
              </div>

              <p className="offers-modal-hint">
                Barème conseillé : {fcfa(estimate.exact)} (fourchette {fcfa(estimate.min)} –{' '}
                {fcfa(estimate.max)})
              </p>

              <button type="button" className="offers-modal-send" onClick={sendCounter}>
                <Handshake size={16} />
                Envoyer la contre-offre
              </button>
            </div>
          </div>
        )}

        <p className="offers-footnote">
          Le prix accepté dans l’application est verrouillé.
        </p>

      </div>
    </Page>
  );
}
