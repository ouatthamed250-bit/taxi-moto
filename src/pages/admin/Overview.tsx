import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Coins,
  MapPin,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { listDrivers, listPassengers } from '../../services/authLocal';
import './Overview.css';

const STATUS_META: Record<string, { label: string; tone: string }> = {
  idle: { label: 'En attente', tone: 'gray' },
  searching: { label: 'Recherche', tone: 'orange' },
  offers: { label: 'Offres envoyées', tone: 'orange' },
  driver_found: { label: 'Conducteur trouvé', tone: 'blue' },
  driver_arriving: { label: 'En route', tone: 'blue' },
  driver_arrived: { label: 'Arrivé', tone: 'blue' },
  in_progress: { label: 'En cours', tone: 'blue' },
  completed: { label: 'Terminée', tone: 'green' },
  cancelled: { label: 'Annulée', tone: 'red' },
};

const QUICK_ACTIONS = [
  { to: '/admin/clients', emoji: '👥', label: 'Gérer les clients' },
  { to: '/admin/drivers', emoji: '🏍️', label: 'Gérer les conducteurs' },
  { to: '/admin/deposits', emoji: '💰', label: 'Valider les dépôts' },
  { to: '/admin/gifts', emoji: '🎁', label: 'Offrir des cadeaux' },
  { to: '/admin/map', emoji: '🗺️', label: 'Voir la carte live' },
  { to: '/admin/settings', emoji: '⚙️', label: 'Ouvrir les paramètres' },
];

export default function Overview() {
  const { adminStats, zoneRules, appSettings, passengerHistory, driverRidesToday } = useApp();

  /* Vraies données utilisateur (localStorage). */
  const passengers = listPassengers();
  const drivers = listDrivers();

  /* Toutes les courses réelles connues (passager + conducteur). */
  const rides = [...passengerHistory, ...driverRidesToday];

  const kpis = [
    {
      key: 'rides',
      icon: Coins,
      label: 'Courses terminées',
      value: adminStats.ridesCompleted.toLocaleString('fr-FR'),
    },
    { key: 'revenue', icon: Wallet, label: 'Revenu brut total', value: fcfa(adminStats.revenue) },
    {
      key: 'commission',
      icon: TrendingUp,
      label: `Commission ${Math.round(appSettings.commissionRate * 100)} %`,
      value: fcfa(Math.round(adminStats.revenue * appSettings.commissionRate)),
    },
    {
      key: 'drivers',
      icon: Users,
      label: 'Conducteurs inscrits',
      value: drivers.length.toString(),
    },
    {
      key: 'passengers',
      icon: UserRound,
      label: 'Clients inscrits',
      value: passengers.length.toString(),
    },
    {
      key: 'active',
      icon: Activity,
      label: 'Courses en cours',
      value: adminStats.ridesActive.toString(),
    },
    { key: 'zones', icon: MapPin, label: 'Zones couvertes', value: zoneRules.length.toString() },
    { key: 'rating', icon: Star, label: 'Note moyenne', value: '—' },
  ];

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Vue d'ensemble</h1>
          <p className="admin-page-subtitle">
            Activité de la plateforme Taxi-Moto en temps réel.
          </p>
        </div>
      </div>

      {/* ===== KPI ===== */}
      <section className="admin-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <article key={kpi.key} className="admin-kpi">
              <span className="admin-kpi-icon">
                <Icon size={18} />
              </span>
              <span className="admin-kpi-label">{kpi.label}</span>
              <strong className="admin-kpi-value">{kpi.value}</strong>
            </article>
          );
        })}
      </section>

      {/* ===== ACTIONS RAPIDES ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Activity size={16} />
          </span>
          <h2 className="admin-section-title">Actions rapides</h2>
        </div>

        <div className="admin-quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} to={action.to} className="admin-quick-action">
              <span className="admin-quick-emoji" aria-hidden="true">
                {action.emoji}
              </span>
              <span>{action.label}</span>
              <ArrowRight size={16} className="admin-quick-arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* ===== COURSES EN TEMPS RÉEL ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Activity size={16} />
          </span>
          <h2 className="admin-section-title">Courses en temps réel</h2>
          <span className="admin-section-count">{rides.length} suivies</span>
        </div>

        {rides.length === 0 ? (
          <p className="admin-empty">Aucune course pour le moment</p>
        ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rides">
            <thead>
              <tr>
                <th>ID</th>
                <th>Passager</th>
                <th>Conducteur</th>
                <th>Véhicule</th>
                <th>Trajet</th>
                <th>Prix</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => {
                const meta = STATUS_META[ride.status] ?? { label: ride.status, tone: 'gray' };

                return (
                  <tr key={ride.id}>
                    <td>{ride.id}</td>
                    <td>{ride.passengerName}</td>
                    <td>{ride.driverName}</td>
                    <td>
                      {VEHICLES[ride.vehicle].emoji} {VEHICLES[ride.vehicle].label}
                    </td>
                    <td>
                      {ride.pickup} → {ride.destination}
                    </td>
                    <td>{ride.price ? fcfa(ride.price) : '—'}</td>
                    <td>
                      <span className={`admin-pill admin-pill--${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td>
                      {ride.date} · {ride.time}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </>
  );
}
