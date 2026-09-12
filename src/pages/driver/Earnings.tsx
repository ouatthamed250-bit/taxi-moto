import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  Gift,
  History,
  Minus,
  Radar,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, COMMISSION_RATE, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import './Earnings.css';

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

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type EarningsFilter = 'today' | 'week' | 'month';

const FILTERS: { key: EarningsFilter; label: string }[] = [
  { key: 'today', label: 'Aujourd’hui' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
];

/** Parse une date "dd/mm/yyyy". */
function parseRideDate(value: string): Date | null {
  const parts = value.split('/');
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;

  return new Date(year, month - 1, day);
}

/** Jours écoulés depuis une date (0 = aujourd'hui). */
function daysSince(value: string): number {
  const rideDate = parseRideDate(value);
  if (!rideDate) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - rideDate.getTime()) / 86400000);
}

export default function DriverEarnings() {
  const navigate = useNavigate();
  const {
    driverRidesToday,
    driverRevenue,
    driverCommission,
    driverNet,
    driverBalance,
    driverGifts,
    accountId,
    phone,
  } = useApp();
  const [filter, setFilter] = useState<EarningsFilter>('today');

  const commissionRate = Math.round(COMMISSION_RATE * 100);

  /**
   * Cadeaux DESTINÉS à ce conducteur.
   * L'admin référence le conducteur par son docId Firestore (`users/{id}`) ;
   * on accepte aussi le téléphone pour les anciens documents.
   */
  const myGifts = driverGifts.filter(
    (gift) => gift.driverId === accountId || gift.driverId === phone,
  );
  const giftTotal = myGifts.reduce((sum, gift) => sum + gift.amount, 0);

  const inPeriod = (days: number) => {
    if (filter === 'today') return days === 0;
    if (filter === 'week') return days >= 0 && days <= 6;
    return days >= 0 && days <= 29;
  };

  const rides = driverRidesToday.filter((ride) => inPeriod(daysSince(ride.date)));

  const periodGross = rides.reduce((sum, ride) => sum + ride.price, 0);
  const periodCommission = rides.reduce((sum, ride) => sum + ride.commission, 0);

  // Les totaux du store correspondent à la journée en cours.
  const gross = filter === 'today' ? driverRevenue : periodGross;
  const commission = filter === 'today' ? driverCommission : periodCommission;
  const net = filter === 'today' ? driverNet : periodGross - periodCommission;
  const average = rides.length > 0 ? net / rides.length : 0;

  // Comparaison avec la période précédente équivalente (si des données existent).
  const prevRides = driverRidesToday.filter((ride) => {
    const days = daysSince(ride.date);
    if (filter === 'today') return days === 1;
    if (filter === 'week') return days >= 7 && days <= 13;
    return days >= 30 && days <= 59;
  });
  const prevNet = prevRides.reduce((sum, ride) => sum + (ride.price - ride.commission), 0);
  const prevAverage = prevRides.length > 0 ? prevNet / prevRides.length : 0;
  const delta =
    prevAverage > 0 ? Math.round(((average - prevAverage) / prevAverage) * 100) : null;

  // Répartition des gains nets sur les 7 derniers jours (index 6 = aujourd'hui).
  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const total = driverRidesToday
      .filter((ride) => daysSince(ride.date) === offset)
      .reduce((sum, ride) => sum + (ride.price - ride.commission), 0);

    const date = new Date();
    date.setDate(date.getDate() - offset);
    const label = WEEKDAYS[(date.getDay() + 6) % 7] ?? '';
    const full = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()] ?? ''}`;

    return { key: `${offset}`, label, full, total, isToday: offset === 0 };
  });
  const maxDay = Math.max(...chartDays.map((day) => day.total), 1);

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-earnings-page">

        {/* Background decoration */}
        <div className="driver-earnings-orb driver-earnings-orb--orange" />
        <div className="driver-earnings-orb driver-earnings-orb--green" />

        {/* ===== HEADER ===== */}
        <header className="driver-earnings-topbar">
          <div className="driver-earnings-brand">
            <div className="driver-earnings-logo" aria-hidden="true">
              <div className="driver-earnings-logo-pin">
                <Radar size={15} strokeWidth={2.6} />
              </div>
              <div className="driver-earnings-logo-wheel driver-earnings-logo-wheel--one" />
              <div className="driver-earnings-logo-wheel driver-earnings-logo-wheel--two" />
            </div>

            <div className="driver-earnings-brand-text">
              <span className="driver-earnings-eyebrow">Taxi Moto</span>
              <h1 className="driver-earnings-title">Mes gains</h1>
            </div>
          </div>

          <button
            type="button"
            className="driver-earnings-profile"
            aria-label="Mon profil"
            onClick={() => navigate('/driver/profile')}
          >
            <UserRound size={19} />
          </button>
        </header>

        {/* ===== FILTRES ===== */}
        <div className="driver-earnings-tabs">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`driver-earnings-tab ${
                filter === item.key ? 'driver-earnings-tab--active' : ''
              }`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ===== HÉRO : NET À RECEVOIR ===== */}
        <section className="driver-earnings-hero">
          <span className="driver-earnings-hero-badge">
            <Wallet size={13} />
            Net à recevoir
          </span>

          <strong className="driver-earnings-hero-value">{fcfa(net)}</strong>

          <span className="driver-earnings-hero-sub">
            Après commission Taxi-Moto ({commissionRate} %)
          </span>

          <div className="driver-earnings-hero-kpis">
            <div className="driver-earnings-hero-kpi">
              <strong>{fcfa(gross)}</strong>
              <span>Brut</span>
            </div>

            <div className="driver-earnings-hero-kpi">
              <strong>−{fcfa(commission)}</strong>
              <span>Commission {commissionRate} %</span>
            </div>

            <div className="driver-earnings-hero-kpi">
              <strong>{rides.length}</strong>
              <span>Courses</span>
            </div>
          </div>
        </section>

        {/* ===== SOLDE ACTUEL ===== */}
        <section className="driver-earnings-balance">
          <div className="driver-earnings-balance-head">
            <span className="driver-earnings-balance-icon">
              <Wallet size={16} />
            </span>
            <span className="driver-earnings-balance-label">Solde actuel</span>
          </div>

          <strong className="driver-earnings-balance-amount">{fcfa(driverBalance)}</strong>
          <span className="driver-earnings-balance-hint">
            Commission {commissionRate} % débitée à chaque course
          </span>
        </section>

        {/* ===== DÉTAIL PAR JOUR (bar chart CSS) ===== */}
        <section className="driver-earnings-card">
          <div className="driver-earnings-card-head">
            <span className="driver-earnings-card-icon">
              <BarChart3 size={15} />
            </span>
            <span className="driver-earnings-card-title">Détail par jour</span>
            <span className="driver-earnings-card-hint">7 derniers jours</span>
          </div>

          <div className="driver-earnings-bars">
            {chartDays.map((day) => (
              <div key={day.key} className="driver-earnings-bar-col" title={`${day.full} · ${fcfa(day.total)}`}>
                <span className="driver-earnings-bar-value">
                  {day.total > 0 ? `${Math.round(day.total / 1000)}k` : ''}
                </span>

                <span className="driver-earnings-bar-track">
                  <span
                    className={`driver-earnings-bar ${
                      day.isToday ? 'driver-earnings-bar--today' : ''
                    }`}
                    style={{ height: `${Math.max(6, Math.round((day.total / maxDay) * 100))}%` }}
                  />
                </span>

                <span
                  className={`driver-earnings-bar-label ${
                    day.isToday ? 'driver-earnings-bar-label--today' : ''
                  }`}
                >
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== MOYENNE PAR COURSE ===== */}
        <section className="driver-earnings-card">
          <div className="driver-earnings-card-head">
            <span className="driver-earnings-card-icon">
              <Banknote size={15} />
            </span>
            <span className="driver-earnings-card-title">Moyenne par course</span>
          </div>

          <div className="driver-earnings-average">
            <strong className="driver-earnings-average-value">
              {fcfa(Math.round(average))}
            </strong>

            {delta === null ? (
              <span className="driver-earnings-trend driver-earnings-trend--flat">
                <Minus size={14} />
                Pas de comparaison
              </span>
            ) : (
              <span
                className={`driver-earnings-trend ${
                  delta >= 0 ? 'driver-earnings-trend--up' : 'driver-earnings-trend--down'
                }`}
              >
                {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {delta >= 0 ? '+' : ''}
                {delta} % vs période précédente
              </span>
            )}
          </div>
        </section>

        {/* ===== HISTORIQUE DES COURSES ===== */}
        <section className="driver-earnings-card">
          <div className="driver-earnings-card-head">
            <span className="driver-earnings-card-icon">
              <History size={15} />
            </span>
            <span className="driver-earnings-card-title">Historique des courses</span>
            <span className="driver-earnings-card-hint">{driverRidesToday.length}</span>
          </div>

          {driverRidesToday.length === 0 ? (
            <p className="driver-earnings-history-empty">Aucune course pour le moment.</p>
          ) : (
            <div className="driver-earnings-history">
              {driverRidesToday.map((ride) => (
                <div key={ride.id} className="driver-earnings-history-item">
                  <span className="driver-earnings-history-avatar">
                    {ride.passengerName.trim().charAt(0).toUpperCase() || 'P'}
                  </span>

                  <div className="driver-earnings-history-info">
                    <strong>{ride.destination}</strong>
                    <span>
                      {ride.date} · {ride.time} · {ride.distanceKm} km
                    </span>
                  </div>

                  <div className="driver-earnings-history-amount">
                    <strong>{fcfa(ride.price)}</strong>
                    <span>net {fcfa(ride.price - ride.commission)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== RECHARGEMENT CADEAU ===== */}
        <section className="driver-earnings-gift">
          <div className="driver-earnings-gift-head">
            <span className="driver-earnings-gift-icon">
              <Gift size={17} />
            </span>
            <div className="driver-earnings-gift-title">
              <strong>Rechargement cadeau</strong>
              <small>Offert par l'administration Taxi-Moto</small>
            </div>
          </div>

          <strong className="driver-earnings-gift-value">{fcfa(giftTotal)}</strong>
          <span className="driver-earnings-gift-hint">
            {myGifts.length === 0
              ? 'Aucun cadeau pour le moment'
              : `${myGifts.length} cadeau${myGifts.length > 1 ? 'x' : ''} reçu${
                  myGifts.length > 1 ? 's' : ''
                }`}
          </span>

          {myGifts.length > 0 && (
            <ul className="driver-earnings-gift-list">
              {myGifts.slice(0, 4).map((gift) => (
                <li key={gift.id} className="driver-earnings-gift-item">
                  <span className="driver-earnings-gift-item-amount">
                    +{fcfa(gift.amount)}
                  </span>
                  <span className="driver-earnings-gift-item-label">
                    {gift.message ?? 'Cadeau Taxi-Moto'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </Page>
  );
}
