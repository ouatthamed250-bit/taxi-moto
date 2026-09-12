import { useRef, useState } from 'react';
import { Check, CircleCheck, Clock, Download, ImageOff, Wallet, X } from 'lucide-react';
import { fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { RechargeStatus } from '../../types';
import './Deposits.css';

const RECHARGE_TABS: { key: RechargeStatus; label: string }[] = [
  { key: 'pending', label: 'En attente' },
  { key: 'approved', label: 'Validées' },
  { key: 'rejected', label: 'Rejetées' },
];

/**
 * Source affichable d'une capture.
 * Ajoute le préfixe `data:` s'il manque (sinon le navigateur n'affiche rien).
 */
function shotSrc(value: string): string {
  if (!value) return '';
  return value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`;
}

/** Tonalité couleur selon la méthode de paiement. */
function methodTone(method: string): string {
  if (method.includes('Orange')) return 'orange';
  if (method.includes('Wave')) return 'wave';
  if (method.includes('MTN')) return 'mtn';
  return 'gray';
}

export default function Deposits() {
  const { rechargeRequests, validateRechargeRequest, rechargeSync, rechargeError } = useApp();

  const [tab, setTab] = useState<RechargeStatus>('pending');
  const [previewShot, setPreviewShot] = useState<string | null>(null);
  /** Captures illisibles (image corrompue) → placeholder + téléchargement. */
  const [brokenShots, setBrokenShots] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  const pendingCount = rechargeRequests.filter((request) => request.status === 'pending').length;
  const filtered = rechargeRequests.filter((request) => request.status === tab);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };

  const handleValidate = (id: string, approved: boolean) => {
    validateRechargeRequest(id, approved);
    showToast(approved ? 'Recharge validée — solde conducteur crédité ✅' : 'Demande rejetée');
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Dépôts mobile money</h1>
          <p className="admin-page-subtitle">
            {pendingCount} en attente · {rechargeRequests.length} demandes au total
          </p>
        </div>

        {/* État du canal temps réel : plus jamais de page vide sans explication. */}
        <span
          className={`admin-sync-badge admin-sync-badge--${rechargeSync}`}
          title={
            rechargeSync === 'live'
              ? 'Les demandes des conducteurs arrivent en temps réel.'
              : rechargeSync === 'error'
                ? 'Le canal temps réel est tombé : les demandes peuvent tarder.'
                : 'Connexion Firestore en cours…'
          }
        >
          {rechargeSync === 'live'
            ? '🟢 Temps réel actif'
            : rechargeSync === 'error'
              ? '🔴 Temps réel interrompu'
              : '⏳ Connexion…'}
        </span>
      </div>

      {rechargeError && (
        <p className="admin-recharge-alert">
          <ImageOff size={14} />
          Synchronisation : {rechargeError}
        </p>
      )}

      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Wallet size={16} />
          </span>
          <h2 className="admin-section-title">Demandes de recharge</h2>
          <span className="admin-section-count">{filtered.length} affichées</span>
        </div>

        <div className="admin-recharge-tabs">
          {RECHARGE_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-recharge-tab${
                tab === item.key ? ' admin-recharge-tab--active' : ''
              }`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              {item.key === 'pending' && pendingCount > 0 && (
                <span className="admin-recharge-tab-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="admin-recharge-empty">
            {tab === 'pending' ? 'Aucune demande en attente' : 'Aucune demande dans cet onglet'}
          </p>
        ) : (
          <div className="admin-recharge-list">
            {filtered.map((request) => (
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

                {request.screenshot &&
                  (brokenShots[request.id] ? (
                    <div className="admin-recharge-shot admin-recharge-shot--broken">
                      <ImageOff size={22} />
                      <span>Capture illisible</span>
                      <a
                        className="admin-recharge-shot-download"
                        href={shotSrc(request.screenshot)}
                        download={`capture-${request.id}.jpg`}
                      >
                        <Download size={14} />
                        Télécharger
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="admin-recharge-shot"
                      onClick={() => setPreviewShot(shotSrc(request.screenshot))}
                    >
                      <img
                        src={shotSrc(request.screenshot)}
                        alt="Capture du paiement"
                        onError={() =>
                          setBrokenShots((previous) => ({
                            ...previous,
                            [request.id]: true,
                          }))
                        }
                      />
                      <span className="admin-recharge-shot-zoom">Agrandir</span>
                    </button>
                  ))}

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

      {/* ===== MODALE : CAPTURE ===== */}
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

            <img
              src={previewShot}
              alt="Capture du paiement"
              onError={() => setPreviewShot(null)}
            />

            <a
              className="admin-shot-download"
              href={previewShot}
              download="capture-paiement.jpg"
            >
              <Download size={15} />
              Télécharger la capture
            </a>
          </div>
        </div>
      )}

      {toast && (
        <div className="admin-toast">
          <CircleCheck size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
