import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Coins,
  Gift,
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
  X,
} from 'lucide-react';
import { COMMISSION_RATE, MIN_FARE, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { ADMIN_RIDES } from '../../data/mock';
import type { DriverProfile, RechargeStatus } from '../../types';
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

/** Onglets de filtrage des demandes de recharge. */
const RECHARGE_TABS: { key: RechargeStatus; label: string }[] = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Validées' },
  { key: 'rejected', label: 'Rejetées' },
];

/** Bornes du cadeau conducteur (FCFA). */
const MIN_GIFT = 100;
const MAX_GIFT = 50000;

/** Tonalité couleur selon la méthode de paiement. */
function methodTone(method: string): string {
  if (method.includes('Orange')) return 'orange';
  if (method.includes('Wave')) return 'wave';
  if (method.includes('MTN')) return 'mtn';
  return 'gray';
}

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
    rechargeRequests,
    validateRechargeRequest,
    addDriverGift,
  } = useApp();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [zoneErrors, setZoneErrors] = useState<Record<string, string>>({});
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());

  /* ---- Recharges ---- */
  const [rechargeTab, setRechargeTab] = useState<RechargeStatus>('pending');
  const [previewShot, setPreviewShot] = useState<string | null>(null);

  /* ---- Cadeaux ---- */
  const [giftDriver, setGiftDriver] = useState<DriverProfile | null>(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftError, setGiftError] = useState('');

  /* ---- Toast ---- */
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

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

  /* ---- Recharges ---- */
  const pendingCount = rechargeRequests.filter((request) => request.status === 'pending').length;
  const filteredRecharges = rechargeRequests.filter((request) => request.status === rechargeTab);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };

  const handleValidate = (id: string, approved: boolean) => {
    validateRechargeRequest(id, approved);
    showToast(approved ? 'Recharge validée — solde conducteur crédité ✅' : 'Demande rejetée');
  };

  /* ---- Cadeaux ---- */
  const openGift = (driver: DriverProfile) => {
    setGiftDriver(driver);
    setGiftAmount('');
    setGiftMessage('');
    setGiftError('');
  };

  const closeGift = () => {
    setGiftDriver(null);
    setGiftAmount('');
    setGiftMessage('');
    setGiftError('');
  };

  const submitGift = () => {
    if (!giftDriver) return;

    const value = Number(giftAmount);
    if (!Number.isFinite(value) || value < MIN_GIFT || value > MAX_GIFT) {
      setGiftError(`Montant invalide (min ${fcfa(MIN_GIFT)}, max ${fcfa(MAX_GIFT)}).`);
      return;
    }

    addDriverGift({
      driverId: giftDriver.id,
      driverName: giftDriver.name,
      amount: value,
      message: giftMessage.trim() || undefined,
    });

    showToast(`Cadeau de ${fcfa(value)} envoyé à ${giftDriver.name} 🎁`);
    closeGift();
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

        {/* ===== DEMANDES DE RECHARGE ===== */}
        <section className="admin-section">
          <div className="admin-section-head">
            <span className="admin-section-icon">
              <Wallet size={16} />
            </span>
            <h2 className="admin-section-title">Demandes de recharge</h2>
            <span className="admin-section-count">
              {pendingCount} en attente · {rechargeRequests.length} au total
            </span>
          </div>

          <div className="admin-recharge-tabs">
            {RECHARGE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`admin-recharge-tab${
                  rechargeTab === tab.key ? ' admin-recharge-tab--active' : ''
                }`}
                onClick={() => setRechargeTab(tab.key)}
              >
                {tab.label}
                {tab.key === 'pending' && pendingCount > 0 && (
                  <span className="admin-recharge-tab-badge">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {filteredRecharges.length === 0 ? (
            <p className="admin-recharge-empty">
              {rechargeTab === 'pending'
                ? 'Aucune demande en attente'
                : 'Aucune demande dans cet onglet'}
            </p>
          ) : (
            <div className="admin-recharge-list">
              {filteredRecharges.map((request) => (
                <article key={request.id} className="admin-recharge-card">
                  <div className="admin-recharge-head">
                    <span className="admin-avatar">
                      {request.driverName.trim().charAt(0).toUpperCase() || 'C'}
                    </span>

                    <div className="admin-recharge-who">
                      <strong>{request.driverName}</strong>
                      <span className="admin-recharge-date">
                        <Clock size={11} />
                        {new Date(request.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>

                    <strong className="admin-recharge-amount">{fcfa(request.amount)}</strong>
                  </div>

                  <div className="admin-recharge-meta">
                    <span
                      className={`admin-recharge-method admin-recharge-method--${methodTone(
                        request.method,
                      )}`}
                    >
                      <Wallet size={13} />
                      {request.method}
                    </span>
                    <span className="admin-recharge-phone">{request.phone}</span>
                  </div>

                  {request.screenshot && (
                    <button
                      type="button"
                      className="admin-recharge-shot"
                      onClick={() => setPreviewShot(request.screenshot)}
                    >
                      <img src={request.screenshot} alt="Capture du paiement" />
                      <span className="admin-recharge-shot-zoom">Agrandir</span>
                    </button>
                  )}

                  {request.status === 'pending' ? (
                    <div className="admin-recharge-actions">
                      <button
                        type="button"
                        className="admin-recharge-approve"
                        onClick={() => handleValidate(request.id, true)}
                      >
                        <Check size={15} />
                        Valider
                      </button>

                      <button
                        type="button"
                        className="admin-recharge-reject"
                        onClick={() => handleValidate(request.id, false)}
                      >
                        <X size={15} />
                        Rejeter
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`admin-pill ${
                        request.status === 'approved' ? 'admin-pill--green' : 'admin-pill--red'
                      }`}
                    >
                      {request.status === 'approved' ? 'Validée' : 'Rejetée'}
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
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
                  <th>Cadeau</th>
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
                    <td>
                      <button
                        type="button"
                        className="admin-gift-btn"
                        onClick={() => openGift(driver)}
                      >
                        🎁 Offrir un cadeau
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

        {/* ===== MODALE : AGRANDIR LA CAPTURE ===== */}
        {previewShot && (
          <div className="admin-shot-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="admin-shot-backdrop"
              aria-label="Fermer"
              onClick={() => setPreviewShot(null)}
            />

            <div className="admin-shot-card">
              <button
                type="button"
                className="admin-shot-close"
                aria-label="Fermer"
                onClick={() => setPreviewShot(null)}
              >
                <X size={20} />
              </button>

              <img src={previewShot} alt="Capture du paiement" />
            </div>
          </div>
        )}

        {/* ===== MODALE : OFFRIR UN CADEAU ===== */}
        {giftDriver && (
          <div className="admin-gift-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="admin-gift-backdrop"
              aria-label="Fermer"
              onClick={closeGift}
            />

            <div className="admin-gift-card">
              <button
                type="button"
                className="admin-gift-close"
                aria-label="Fermer"
                onClick={closeGift}
              >
                <X size={18} />
              </button>

              <div className="admin-gift-head">
                <span className="admin-gift-icon">
                  <Gift size={18} />
                </span>
                <div>
                  <strong className="admin-gift-title">Offrir un cadeau</strong>
                  <span className="admin-gift-sub">{giftDriver.name}</span>
                </div>
              </div>

              <label className="admin-gift-field">
                <span>Montant (FCFA)</span>
                <input
                  type="number"
                  min={MIN_GIFT}
                  max={MAX_GIFT}
                  placeholder="Ex : 1000"
                  value={giftAmount}
                  onChange={(event) => setGiftAmount(event.target.value)}
                />
                <small>
                  Minimum {fcfa(MIN_GIFT)} · Maximum {fcfa(MAX_GIFT)}
                </small>
              </label>

              <label className="admin-gift-field">
                <span>Message (optionnel)</span>
                <input
                  type="text"
                  placeholder="Ex : Bonus fidélité"
                  value={giftMessage}
                  onChange={(event) => setGiftMessage(event.target.value)}
                />
              </label>

              {giftError && (
                <p className="admin-gift-error">
                  <AlertTriangle size={14} />
                  {giftError}
                </p>
              )}

              <button type="button" className="admin-gift-submit" onClick={submitGift}>
                <Gift size={16} />
                Envoyer le cadeau
              </button>
            </div>
          </div>
        )}

        {toast && <div className="admin-toast">{toast}</div>}

      </div>
    </div>
  );
}
