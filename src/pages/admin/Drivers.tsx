import { useRef, useState } from 'react';
import { AlertTriangle, Bike, CheckCircle2, Gift, Search, Wallet, X } from 'lucide-react';
import { VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { listDrivers, setUserBlocked } from '../../services/authLocal';
import type { User } from '../../types';
import './Drivers.css';

const MIN_GIFT = 100;
const MAX_GIFT = 50000;

type DriverFilter = 'all' | 'active' | 'suspended';

const FILTERS: { key: DriverFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'suspended', label: 'Suspendus' },
];

export default function Drivers() {
  const { addDriverGift, driverBalance, userName } = useApp();

  const [drivers, setDrivers] = useState(() => listDrivers());
  const [filter, setFilter] = useState<DriverFilter>('all');
  const [query, setQuery] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [giftDriver, setGiftDriver] = useState<User | null>(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftError, setGiftError] = useState('');

  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = drivers.filter((driver) => {
    if (filter === 'active' && driver.blocked) return false;
    if (filter === 'suspended' && !driver.blocked) return false;
    if (normalizedQuery && !driver.name.toLowerCase().includes(normalizedQuery)) return false;
    return true;
  });

  const setSuspended = (driver: User, blocked: boolean) => {
    setUserBlocked(driver.phone, blocked);
    setDrivers(listDrivers());
    showToast(blocked ? `${driver.name} suspendu` : `${driver.name} réactivé`);
  };

  const openGift = (driver: User) => {
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
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Conducteurs</h1>
          <p className="admin-page-subtitle">
            {drivers.length} conducteur{drivers.length > 1 ? 's' : ''} inscrit
            {drivers.length > 1 ? 's' : ''} · solde virtuel simulé {fcfa(driverBalance)}
          </p>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Wallet size={16} />
          </span>
          <h2 className="admin-section-title">Solde conducteur simulé</h2>
        </div>

        <strong className="admin-drivers-balance">{fcfa(driverBalance)}</strong>
        <p className="admin-section-note">
          Solde du conducteur connecté ({userName || 'Conducteur'}) — crédité par les recharges
          validées et les cadeaux.
        </p>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Bike size={16} />
          </span>
          <h2 className="admin-section-title">Gestion des conducteurs</h2>
          <span className="admin-section-count">{filtered.length} affichés</span>
        </div>

        <div className="admin-toolbar">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-recharge-tab${
                filter === item.key ? ' admin-recharge-tab--active' : ''
              }`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}

          <label className="admin-search">
            <span className="admin-search-icon">
              <Search size={17} />
            </span>
            <input
              type="search"
              placeholder="Rechercher un conducteur…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="admin-empty">
            {drivers.length === 0 ? 'Aucun conducteur inscrit' : 'Aucun conducteur dans ce filtre'}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Conducteur</th>
                  <th>Photos</th>
                  <th>Véhicule</th>
                  <th>Solde</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((driver) => {
                  const vehicleKey = driver.vehicle ?? 'moto';
                  const isMe =
                    driver.name.trim().toLowerCase() === (userName || '').trim().toLowerCase();

                  return (
                    <tr key={driver.id}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-avatar">
                            {driver.name.trim().charAt(0).toUpperCase() || 'C'}
                          </span>
                          <div>
                            <strong>{driver.name}</strong>
                            <br />
                            <span className="admin-muted">{driver.phone}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="admin-photos">
                          {driver.driverPhoto ? (
                            <button
                              type="button"
                              className="admin-photo"
                              onClick={() => setPreviewPhoto(driver.driverPhoto ?? null)}
                            >
                              <img src={driver.driverPhoto} alt="Photo du conducteur" />
                            </button>
                          ) : (
                            <span className="admin-photo admin-photo--empty">👤</span>
                          )}

                          {driver.vehiclePhoto ? (
                            <button
                              type="button"
                              className="admin-photo"
                              onClick={() => setPreviewPhoto(driver.vehiclePhoto ?? null)}
                            >
                              <img src={driver.vehiclePhoto} alt="Photo du véhicule" />
                            </button>
                          ) : (
                            <span className="admin-photo admin-photo--empty">🏍️</span>
                          )}
                        </div>
                      </td>

                      <td>
                        {VEHICLES[vehicleKey].emoji} {VEHICLES[vehicleKey].label}
                        <br />
                        <span className="admin-muted">{driver.plate ?? '—'}</span>
                      </td>

                      <td>{isMe ? fcfa(driverBalance) : '—'}</td>

                      <td>
                        <span
                          className={`admin-pill ${
                            driver.blocked ? 'admin-pill--red' : 'admin-pill--green'
                          }`}
                        >
                          {driver.blocked ? 'Suspendu' : 'Actif'}
                        </span>
                      </td>

                      <td>
                        <div className="admin-actions">
                          {driver.blocked ? (
                            <button
                              type="button"
                              className="admin-toggle admin-toggle--restore"
                              onClick={() => setSuspended(driver, false)}
                            >
                              Réactiver
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-toggle admin-toggle--suspend"
                              onClick={() => setSuspended(driver, true)}
                            >
                              Suspendre
                            </button>
                          )}

                          <button
                            type="button"
                            className="admin-gift-btn"
                            onClick={() => openGift(driver)}
                          >
                            🎁 Offrir un cadeau
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== MODALE : PHOTO ===== */}
      {previewPhoto && (
        <div className="admin-shot-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-shot-backdrop"
            aria-label="Fermer"
            onClick={() => setPreviewPhoto(null)}
          />

          <div className="admin-shot-card">
            <button
              type="button"
              className="admin-shot-close"
              aria-label="Fermer"
              onClick={() => setPreviewPhoto(null)}
            >
              <X size={20} />
            </button>

            <img src={previewPhoto} alt="Photo agrandie" />
          </div>
        </div>
      )}

      {/* ===== MODALE : CADEAU ===== */}
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

      {toast && (
        <div className="admin-toast">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
