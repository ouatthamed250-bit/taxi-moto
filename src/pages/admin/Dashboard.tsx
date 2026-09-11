import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Coins,
  LockKeyhole,
  LogOut,
  MapPin,
  Radar,
  RefreshCw,
  ShieldCheck,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { COMMISSION_RATE, MIN_FARE, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { ADMIN_RIDES } from '../../data/mock';
import './Dashboard.css';

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    role,
    login,
    logout,
    adminStats,
    zoneRules,
    updateZoneRule,
    adminDrivers,
    toggleDriverStatus,
  } = useApp();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [zoneErrors, setZoneErrors] = useState<Record<string, string>>({});
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());

  // PROTECTION : l'écran admin n'est accessible qu'avec le rôle administrateur.
  if (role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-lock">
          <span className="admin-lock-icon">
            <LockKeyhole size={34} strokeWidth={2.1} />
          </span>

          <strong className="admin-lock-title">Accès réservé</strong>

          <p className="admin-lock-text">
            Cet espace est réservé à l’administration Taxi-Moto. Connectez-vous avec un compte
            administrateur pour continuer.
          </p>

          <div className="admin-lock-actions">
            <button type="button" className="admin-lock-back" onClick={() => navigate('/login')}>
              Retour à la connexion
            </button>

            <button
              type="button"
              className="admin-lock-demo"
              onClick={() => login('admin', 'Administrateur', '')}
            >
              Accès démonstration
            </button>
          </div>
        </div>
      </div>
    );
  }

  const driversOnline = adminDrivers.filter((driver) => driver.online).length;
  const averageRating =
    adminDrivers.length > 0
      ? (
          adminDrivers.reduce((sum, driver) => sum + driver.rating, 0) / adminDrivers.length
        ).toFixed(1)
      : '—';

  const kpis = [
    {
      key: 'rides',
      icon: Coins,
      label: 'Courses totales',
      value: adminStats.ridesCompleted.toLocaleString('fr-FR'),
    },
    { key: 'revenue', icon: Wallet, label: 'Revenu brut total', value: fcfa(adminStats.revenue) },
    {
      key: 'commission',
      icon: TrendingUp,
      label: `Commission ${Math.round(COMMISSION_RATE * 100)} %`,
      value: fcfa(Math.round(adminStats.revenue * COMMISSION_RATE)),
    },
    {
      key: 'drivers',
      icon: Users,
      label: 'Conducteurs actifs',
      value: `${driversOnline} / ${adminStats.drivers}`,
    },
    {
      key: 'passengers',
      icon: UserRound,
      label: 'Passagers inscrits',
      value: adminStats.passengers.toLocaleString('fr-FR'),
    },
    {
      key: 'active',
      icon: Activity,
      label: 'Courses en cours',
      value: adminStats.ridesActive.toString(),
    },
    { key: 'zones', icon: MapPin, label: 'Zones couvertes', value: zoneRules.length.toString() },
    { key: 'rating', icon: Star, label: 'Note moyenne', value: averageRating },
  ];

  const saveZone = (zone: string, current: number) => {
    const raw = drafts[zone] ?? String(current);
    const value = Number(raw);

    if (!Number.isFinite(value) || value < MIN_FARE) {
      setZoneErrors((prev) => ({ ...prev, [zone]: `Minimum ${fcfa(MIN_FARE)} requis.` }));
      return;
    }

    updateZoneRule(zone, { min: value });
    setZoneErrors((prev) => ({ ...prev, [zone]: '' }));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[zone];
      return next;
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">

        {/* ===== HEADER ===== */}
        <header className="admin-header">
          <div className="admin-brand">
            <div className="admin-logo" aria-hidden="true">
              <div className="admin-logo-pin">
                <Radar size={16} strokeWidth={2.6} />
              </div>
              <div className="admin-logo-wheel admin-logo-wheel--one" />
              <div className="admin-logo-wheel admin-logo-wheel--two" />
            </div>

            <div className="admin-brand-text">
              <span className="admin-eyebrow">Taxi Moto · Côte d’Ivoire 🇨🇮</span>
              <h1 className="admin-title">Tableau de bord</h1>
            </div>

            <span className="admin-handle">
              <ShieldCheck size={12} />
              Administration
            </span>
          </div>

          <div className="admin-header-actions">
            <button type="button" className="admin-ghost" onClick={() => navigate('/')}>
              Retour au site
            </button>

            <button
              type="button"
              className="admin-logout"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </header>

        {/* ===== VUE D'ENSEMBLE ===== */}
        <section className="admin-section">
          <div className="admin-section-head">
            <span className="admin-section-icon">
              <TrendingUp size={16} />
            </span>
            <h2 className="admin-section-title">Vue d’ensemble</h2>
            <span className="admin-section-count">Données temps réel</span>
          </div>

          <div className="admin-kpis">
            {kpis.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.key} className="admin-kpi">
                  <span className="admin-kpi-icon">
                    <Icon size={17} />
                  </span>
                  <strong className="admin-kpi-value">{item.value}</strong>
                  <span className="admin-kpi-label">{item.label}</span>
                </article>
              );
            })}
          </div>
        </section>

        {/* ===== GESTION DES CONDUCTEURS ===== */}
        <section className="admin-section">
          <div className="admin-section-head">
            <span className="admin-section-icon">
              <Users size={16} />
            </span>
            <h2 className="admin-section-title">Gestion des conducteurs</h2>
            <span className="admin-section-count">
              {driversOnline} en ligne · {adminDrivers.length} au total
            </span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Conducteur</th>
                  <th>Véhicule</th>
                  <th>Zone</th>
                  <th>Note</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminDrivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <div className="admin-driver">
                        <span className="admin-avatar">
                          {driver.name.trim().charAt(0).toUpperCase() || 'C'}
                        </span>
                        <div>
                          <strong className="admin-driver-name">{driver.name}</strong>
                          <span className="admin-driver-plate">{driver.plate}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {VEHICLES[driver.vehicle].emoji} {VEHICLES[driver.vehicle].label}
                    </td>
                    <td>{driver.zone}</td>
                    <td>⭐ {driver.rating}</td>
                    <td>
                      <span
                        className={`admin-pill ${
                          driver.online ? 'admin-pill--green' : 'admin-pill--gray'
                        }`}
                      >
                        {driver.online ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-toggle ${
                          driver.online ? 'admin-toggle--suspend' : 'admin-toggle--restore'
                        }`}
                        onClick={() => toggleDriverStatus(driver.id)}
                      >
                        {driver.online ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>


        {/* ===== RÈGLES TARIFAIRES ===== */}
        <section className="admin-section">
          <div className="admin-section-head">
            <span className="admin-section-icon">
              <MapPin size={16} />
            </span>
            <h2 className="admin-section-title">Règles tarifaires par zone</h2>
            <span className="admin-section-count">Minimum {fcfa(MIN_FARE)}</span>
          </div>

          <p className="admin-section-note">
            Le conducteur propose son prix. L’admin encadre le minimum par zone et suit les prix
            réellement observés.
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Minimum (FCFA)</th>
                  <th>Prix observé</th>
                  <th>Courses</th>
                  <th>Prix moyen</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {zoneRules.map((rule) => (
                  <tr key={rule.zone}>
                    <td>{rule.zone}</td>
                    <td>
                      <input
                        type="number"
                        className="admin-zone-input"
                        min={MIN_FARE}
                        value={drafts[rule.zone] ?? String(rule.min)}
                        onChange={(event) =>
                          setDrafts((prev) => ({ ...prev, [rule.zone]: event.target.value }))
                        }
                      />

                      {zoneErrors[rule.zone] && (
                        <span className="admin-zone-error">
                          <AlertTriangle size={12} />
                          {zoneErrors[rule.zone]}
                        </span>
                      )}
                    </td>
                    <td>{rule.observed}</td>
                    <td>{rule.courses.toLocaleString('fr-FR')}</td>
                    <td>{fcfa(rule.average)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-zone-save"
                        onClick={() => saveZone(rule.zone, rule.min)}
                      >
                        Enregistrer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>


        {/* ===== COURSES EN TEMPS RÉEL ===== */}
        <section className="admin-section">
          <div className="admin-section-head">
            <span className="admin-section-icon">
              <Activity size={16} />
            </span>
            <h2 className="admin-section-title">Courses en temps réel</h2>

            <span className="admin-section-count">
              {ADMIN_RIDES.length} suivies · actualisé à {refreshedAt.toLocaleTimeString('fr-FR')}
            </span>

            <button
              type="button"
              className="admin-refresh"
              onClick={() => setRefreshedAt(new Date())}
            >
              <RefreshCw size={15} />
              Actualiser
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-table--rides">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Passager</th>
                  <th>Conducteur</th>
                  <th>Véhicule</th>
                  <th>Trajet</th>
                  <th>Distance</th>
                  <th>Prix</th>
                  <th>Commission</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_RIDES.map((ride) => {
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
                      <td>{ride.distanceKm} km</td>
                      <td>{ride.price ? fcfa(ride.price) : '—'}</td>
                      <td>{ride.commission ? fcfa(ride.commission) : '—'}</td>
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
        </section>


      </div>
    </div>
  );
}
