import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  Check,
  Clock,
  MapPin,
  Navigation,
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
import './Dashboard.css';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const {
    userName,
    driverOnline,
    toggleOnline,
    incomingRequest,
    triggerIncoming,
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
  } = useApp();
  const [fare, setFare] = useState(1500);

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

  useEffect(() => {
    if (!driverOnline || incomingRequest) return;
    const timer = window.setTimeout(() => triggerIncoming(), 3000);
    return () => window.clearTimeout(timer);
  }, [driverOnline, incomingRequest, triggerIncoming]);

  const info = VEHICLES[incomingRequest?.vehicle ?? 'moto'];

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-dashboard-page">

        {/* ===== CARTE ===== */}
        <div className="driver-dashboard-map">
          <MapComponent center={ABIDJAN_CENTER} meLabel="Votre position" />

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

          {/* Demande entrante / en attente */}
          {incomingRequest ? (
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

          {/* Bouton de test — développement uniquement */}
          {import.meta.env.DEV && (
            <button
              type="button"
              className="driver-dashboard-dev"
              onClick={triggerIncoming}
            >
              <BellRing size={16} />
              Tester la notification (dev)
            </button>
          )}



        </section>
      </div>
    </Page>
  );
}
