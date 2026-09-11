import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Car, History, MapPin, Radar } from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { VehicleType } from '../../types';
import './Rides.css';

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.png',
  tricycle: '/images/tricycle.png',
};

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

type RideFilter = 'today' | 'week' | 'all';

const FILTERS: { key: RideFilter; label: string }[] = [
  { key: 'today', label: 'Aujourd’hui' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'all', label: 'Tout' },
];

const STATUS_META: Record<string, { label: string; tone: 'green' | 'red' | 'blue' }> = {
  completed: { label: 'Terminée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'red' },
};

/** Jours écoulés depuis une date "dd/mm/yyyy" (0 = aujourd'hui). */
function daysSince(value: string): number {
  const parts = value.split('/');
  if (parts.length !== 3) return 0;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return 0;

  const rideDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - rideDate.getTime()) / 86400000);
}

/** "09/11/2026" → "Aujourd'hui" · "Hier" · "9 nov." */
function formatRideDate(value: string): string {
  const parts = value.split('/');
  if (parts.length !== 3) return value;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  if (!day || !month) return value;

  const days = daysSince(value);
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Hier';
  return `${day} ${MONTHS_SHORT[month - 1] ?? value}`;
}

export default function DriverRides() {
  const navigate = useNavigate();
  const { driverRidesToday } = useApp();

  const [filter, setFilter] = useState<RideFilter>('today');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1800);
  };

  // Filtrage par date : aujourd'hui / 7 derniers jours / tout.
  const rides = driverRidesToday.filter((ride) => {
    if (filter === 'all') return true;
    const days = daysSince(ride.date);
    return filter === 'today' ? days === 0 : days >= 0 && days <= 7;
  });

  const gross = rides.reduce((sum, ride) => sum + ride.price, 0);
  const commission = rides.reduce((sum, ride) => sum + ride.commission, 0);
  const net = gross - commission;

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-rides-page">

        {/* Background decoration */}
        <div className="driver-rides-orb driver-rides-orb--orange" />
        <div className="driver-rides-orb driver-rides-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="driver-rides-topbar">
          <div className="driver-rides-brand">
            <div className="driver-rides-logo" aria-hidden="true">
              <div className="driver-rides-logo-pin">
                <Radar size={15} strokeWidth={2.6} />
              </div>
              <div className="driver-rides-logo-wheel driver-rides-logo-wheel--one" />
              <div className="driver-rides-logo-wheel driver-rides-logo-wheel--two" />
            </div>

            <div className="driver-rides-brand-text">
              <span className="driver-rides-eyebrow">Taxi Moto</span>
              <h1 className="driver-rides-title">Mes courses</h1>
            </div>
          </div>

          <span className="driver-rides-count">{driverRidesToday.length}</span>
        </header>

        {/* ===== FILTRES ===== */}
        <div className="driver-rides-tabs">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`driver-rides-tab ${
                filter === item.key ? 'driver-rides-tab--active' : ''
              }`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ===== STATS ===== */}
        <section className="driver-rides-stats">
          <div className="driver-rides-stat">
            <strong>{rides.length}</strong>
            <span>Courses</span>
          </div>

          <div className="driver-rides-stat driver-rides-stat--net">
            <strong>{fcfa(net)}</strong>
            <span>Net gagné</span>
          </div>

          <div className="driver-rides-stat">
            <strong>{fcfa(commission)}</strong>
            <span>Commission</span>
          </div>
        </section>

        {/* ===== LISTE / ÉTAT VIDE ===== */}
        {rides.length === 0 ? (
          <section className="driver-rides-empty">
            <span className="driver-rides-empty-icon">
              <History size={30} strokeWidth={1.8} />
            </span>

            <strong>Aucune course sur cette période</strong>
            <p>Changez de filtre ou repassez en ligne pour recevoir des demandes.</p>

            <button
              type="button"
              className="driver-rides-empty-button"
              onClick={() => navigate('/driver')}
            >
              Retour au Dashboard
            </button>
          </section>
        ) : (
          <div className="driver-rides-list">
            {rides.map((ride) => {
              const meta =
                STATUS_META[ride.status] ?? { label: 'En cours', tone: 'blue' as const };
              const vehicleKey = ride.vehicle;
              const initial = ride.passengerName.trim().charAt(0).toUpperCase() || 'P';

              return (
                <button
                  key={ride.id}
                  type="button"
                  className={`driver-rides-card driver-rides-card--${vehicleKey}`}
                  onClick={() => showToast('Détail de la course bientôt disponible')}
                >
                  <div className="driver-rides-card-head">
                    <span className="driver-rides-avatar">{initial}</span>

                    <div className="driver-rides-id">
                      <strong className="driver-rides-passenger">{ride.passengerName}</strong>
                      <span className="driver-rides-date">
                        {formatRideDate(ride.date)} · {ride.time}
                      </span>
                    </div>

                    <div className="driver-rides-price">
                      <strong>{fcfa(ride.price)}</strong>
                      <span
                        className={`driver-rides-status driver-rides-status--${meta.tone}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <div className="driver-rides-rows">
                    <div className="driver-rides-row">
                      <span className="driver-rides-row-icon">
                        <MapPin size={14} />
                      </span>
                      <span className="driver-rides-row-text">{ride.destination}</span>
                    </div>

                    <div className="driver-rides-row">
                      <span className="driver-rides-vehicle">
                        {brokenImages[ride.id] ? (
                          vehicleKey === 'moto' ? (
                            <Bike size={15} strokeWidth={1.9} />
                          ) : (
                            <Car size={15} strokeWidth={1.9} />
                          )
                        ) : (
                          <img
                            className="driver-rides-vehicle-img"
                            src={VEHICLE_IMAGES[vehicleKey]}
                            alt={VEHICLES[vehicleKey].label}
                            onError={() =>
                              setBrokenImages((prev) => ({ ...prev, [ride.id]: true }))
                            }
                          />
                        )}
                      </span>
                      <span className="driver-rides-row-text">
                        {VEHICLES[vehicleKey].label} · {ride.distanceKm} km
                      </span>
                    </div>
                  </div>

                  <p className="driver-rides-net">
                    Commission 7 % ({fcfa(ride.commission)}) · Net conducteur :{' '}
                    {fcfa(ride.price - ride.commission)}
                  </p>
                </button>
              );
            })}
          </div>
        )}


        {toast && <div className="driver-rides-toast">{toast}</div>}
      </div>
    </Page>
  );
}
