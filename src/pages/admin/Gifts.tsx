import { Gift } from 'lucide-react';
import { fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import './Gifts.css';

export default function Gifts() {
  const { driverGifts } = useApp();

  const total = driverGifts.reduce((sum, gift) => sum + gift.amount, 0);

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Historique des cadeaux</h1>
          <p className="admin-page-subtitle">
            {driverGifts.length} cadeau{driverGifts.length > 1 ? 'x' : ''} · total distribué{' '}
            {fcfa(total)}
          </p>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Gift size={16} />
          </span>
          <h2 className="admin-section-title">Cadeaux envoyés</h2>
          <span className="admin-section-count">Total : {fcfa(total)}</span>
        </div>

        <strong className="admin-gifts-total">{fcfa(total)}</strong>

        {driverGifts.length === 0 ? (
          <p className="admin-empty">Aucun cadeau envoyé pour le moment.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Conducteur</th>
                  <th>Montant</th>
                  <th>Message</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {driverGifts.map((gift) => (
                  <tr key={gift.id}>
                    <td>
                      {new Date(gift.createdAt).toLocaleDateString('fr-FR')}{' '}
                      <span className="admin-muted">
                        {new Date(gift.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-avatar">
                          {gift.driverName.trim().charAt(0).toUpperCase() || 'C'}
                        </span>
                        <strong>{gift.driverName}</strong>
                      </div>
                    </td>
                    <td>
                      <strong className="admin-gift-amount">{fcfa(gift.amount)}</strong>
                    </td>
                    <td>{gift.message || '—'}</td>
                    <td>
                      <span className="admin-pill admin-pill--green">Distribué</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
