import { useRef, useState } from 'react';
import { Ban, CheckCircle2, Search, Users } from 'lucide-react';
import { useApp } from '../../store/useApp';
import { listPassengers, setUserBlocked } from '../../services/authLocal';
import './Clients.css';

export default function Clients() {
  const { appSettings } = useApp();

  const [passengers, setPassengers] = useState(() => listPassengers());
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? passengers.filter(
        (user) =>
          user.name.toLowerCase().includes(normalizedQuery) ||
          user.phone.includes(normalizedQuery.replace(/\D/g, '')),
      )
    : passengers;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  const toggleBlocked = (phone: string, blocked: boolean) => {
    setUserBlocked(phone, blocked);
    setPassengers(listPassengers());
    showToast(blocked ? 'Compte bloqué' : 'Compte débloqué');
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Clients inscrits</h1>
          <p className="admin-page-subtitle">
            {passengers.length} client{passengers.length > 1 ? 's' : ''} · Inscriptions
            {appSettings.passengerRegistrationEnabled ? ' ouvertes' : ' fermées'}
          </p>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Users size={16} />
          </span>
          <h2 className="admin-section-title">Liste des clients</h2>
          <span className="admin-section-count">{filtered.length} affichés</span>
        </div>

        <div className="admin-toolbar">
          <label className="admin-search">
            <span className="admin-search-icon">
              <Search size={17} />
            </span>
            <input
              type="search"
              placeholder="Rechercher un nom ou un numéro…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="admin-empty">
            {passengers.length === 0 ? 'Aucun client inscrit' : 'Aucun client trouvé'}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Téléphone</th>
                  <th>Inscription</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-avatar">
                          {user.name.trim().charAt(0).toUpperCase() || 'C'}
                        </span>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>{user.phone}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <span
                        className={`admin-pill ${
                          user.blocked ? 'admin-pill--red' : 'admin-pill--green'
                        }`}
                      >
                        {user.blocked ? 'Bloqué' : 'Actif'}
                      </span>
                    </td>
                    <td>
                      {user.blocked ? (
                        <button
                          type="button"
                          className="admin-toggle admin-toggle--restore"
                          onClick={() => toggleBlocked(user.phone, false)}
                        >
                          Débloquer
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-toggle admin-toggle--suspend"
                          onClick={() => toggleBlocked(user.phone, true)}
                        >
                          <Ban size={13} />
                          Bloquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toast && (
        <div className="admin-toast">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
