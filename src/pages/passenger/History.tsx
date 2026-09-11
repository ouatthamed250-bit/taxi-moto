import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Car, History, MapPin, Radar } from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { VehicleType } from '../../types';
import './History.css';

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.jpg',
  tricycle: '/images/tricycle.jpg',
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

/** "09/11/2026" → "Aujourd'hui" · "Hier" · "9 nov." */
function formatRideDate(value: string): string {
  const parts = value.split('/');
  if (parts.length !== 3) return value;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return value;

  const rideDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - rideDate.getTime()) / 86400000);

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `${day} ${MONTHS_SHORT[month - 1] ?? value}`;
}

const STATUS_META: Record<string, { label: string; tone: 'green' | 'red' | 'blue' }> = {
  completed: { label: 'Terminée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'red' },
};

export default function PassengerHistory() {
  const navigate = useNavigate();
  const { passengerHistory } = useApp();

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

  const completed = passengerHistory.filter((ride) => ride.status === 'completed');
  const totalSpent = completed.reduce((sum, ride) => sum + ride.price, 0);
  const totalDistance = completed.reduce((sum, ride) => sum + ride.distanceKm, 0);

  return (
    <Page nav="passenger" background={COLORS.white}>
      <div className="history-page">

        {/* Background decoration */}
        <div className="history-orb history-orb--orange" />
        <div className="history-orb history-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="history-topbar">
          <div className="history-brand">
            <div className="history-logo" aria-hidden="true">
              <div className="history-logo-pin">
                <Radar size={15} strokeWidth={2.6} />
              </div>
              <div className="history-logo-wheel history-logo-wheel--one" />
              <div className="history-logo-wheel history-logo-wheel--two" />
            </div>

            <div className="history-brand-text">
              <span className="history-eyebrow">Taxi Moto</span>
              <h1 className="history-title">Mes courses</h1>
            </div>
          </div>

          <span className="history-count">{passengerHistory.length}</span>
        </header>

        {passengerHistory.length === 0 ? (
          <section className="history-empty">
            <span className="history-empty-icon">
              <History size={30} strokeWidth={1.8} />
            </span>

            <strong>Aucune course pour l’instant</strong>
            <p>Vos trajets terminés apparaîtront ici, avec le chauffeur et le prix payé.</p>

            <button
              type="button"
              className="history-empty-button"
              onClick={() => navigate('/passenger')}
            >
              Commander ma première course
            </button>
          </section>
        ) : (
          <>
            {/* ===== STATS ===== */}
            <section className="history-stats">
              <div className="history-stat">
                <strong>{completed.length}</strong>
                <span>Courses</span>
              </div>

              <div className="history-stat">
                <strong>{fcfa(totalSpent)}</strong>
                <span>Total dépensé</span>
              </div>

              <div className="history-stat">
                <strong>{totalDistance.toFixed(1)} km</strong>
                <span>Distance</span>
              </div>
            </section>

            <div className="history-list">
              {passengerHistory.map((ride) => {
                const meta =
                  STATUS_META[ride.status] ?? { label: 'En cours', tone: 'blue' as const };
                const vehicleKey = ride.vehicle;
                const initial = ride.driverName.trim().charAt(0).toUpperCase() || 'C';

                return (
                  <button
                    key={ride.id}
                    type="button"
                    className={`history-card history-card--${vehicleKey}`}
                    onClick={() => showToast('Détail de la course bientôt disponible')}
                  >
                    <div className="history-card-head">
                      <span className="history-avatar">{initial}</span>

                      <div className="history-card-id">
                        <strong className="history-driver">{ride.driverName}</strong>
                        <span className="history-date">
                          {formatRideDate(ride.date)} · {ride.time}
                        </span>
                      </div>

                      <div className="history-price">
                        <strong>{fcfa(ride.price)}</strong>
                        <span className={`history-status history-status--${meta.tone}`}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="history-card-rows">
                      <div className="history-row">
                        <span className="history-row-icon history-row-icon--dest">
                          <MapPin size={14} />
                        </span>
                        <span className="history-row-text">{ride.destination}</span>
                      </div>

                      <div className="history-row">
                        <span className="history-vehicle-badge">
                          {brokenImages[ride.id] ? (
                            vehicleKey === 'moto' ? (
                              <Bike size={15} strokeWidth={1.9} />
                            ) : (
                              <Car size={15} strokeWidth={1.9} />
                            )
                          ) : (
                            <img
                              className="history-vehicle-img"
                              src={VEHICLE_IMAGES[vehicleKey]}
                              alt={VEHICLES[vehicleKey].label}
                              onError={() =>
                                setBrokenImages((prev) => ({ ...prev, [ride.id]: true }))
                              }
                            />
                          )}
                        </span>
                        <span className="history-row-text">
                          {VEHICLES[vehicleKey].label} · {ride.distanceKm} km
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

          </>
        )}

        {toast && <div className="history-toast">{toast}</div>}
      </div>
    </Page>
  );
}
