import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Camera,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Radar,
  Shield,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { updateUser } from '../../services/firestore';
import { compressImageFile } from '../../services/imageCompress';
import { averageRideRating, countRatedRides } from '../../data/rides';
import type { VehicleType } from '../../types';
import './Profile.css';

const MENU = [
  { key: 'vehicle', icon: Bike, label: 'Mon véhicule', hint: 'Véhicule, modèle et plaque' },
  { key: 'documents', icon: FileText, label: 'Mes documents', hint: 'Permis, carte grise…' },
  { key: 'payments', icon: Wallet, label: 'Moyens de paiement', hint: 'Mobile Money, banque' },
  {
    key: 'security',
    icon: Shield,
    label: 'Sécurité et confidentialité',
    hint: 'Compte et données',
  },
  { key: 'help', icon: HelpCircle, label: 'Aide et assistance', hint: 'FAQ et support' },
];

export default function DriverProfile() {
  const navigate = useNavigate();
  const {
    userName,
    phone,
    accountId,
    currentUser,
    driverApproved,
    vehicle,
    driverRideHistory,
    driverNet,
    logout,
  } = useApp();

  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);
  /** Photos du conducteur et de son véhicule (mises à jour à l'envoi). */
  const [photos, setPhotos] = useState({
    driverPhoto: currentUser?.driverPhoto ?? '',
    vehiclePhoto: currentUser?.vehiclePhoto ?? '',
  });
  /** Type de photo en cours d'envoi ('' = aucun). */
  const [photoBusy, setPhotoBusy] = useState<'' | 'driver' | 'vehicle'>('');

  /**
   * Change la photo du conducteur (`driverPhoto`) ou de son véhicule
   * (`vehiclePhoto`) : compression puis écriture dans `users/{accountId}` —
   * le client les voit ensuite sur l'écran des offres.
   */
  const changePhoto = async (kind: 'driver' | 'vehicle', file: File | null | undefined) => {
    if (!file || !accountId) return;

    setPhotoBusy(kind);

    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 640,
        maxBytes: 120 * 1024,
        quality: 0.6,
      });

      const patch =
        kind === 'driver'
          ? { driverPhoto: compressed.dataUrl }
          : { vehiclePhoto: compressed.dataUrl };

      const result = await updateUser(accountId, patch);

      if (!result.ok) {
        throw new Error(result.error ?? 'écriture impossible');
      }

      setPhotos((current) => ({ ...current, ...patch }));
      console.info(
        `[driver] photo ${kind} mise à jour (${Math.round(compressed.bytes / 1024)} Ko)`,
      );
      showToast(
        kind === 'driver' ? 'Photo de profil mise à jour ✅' : 'Photo du véhicule mise à jour ✅',
      );
    } catch (error) {
      console.warn('[driver] photo impossible :', error);
      showToast('Envoi de la photo impossible — réessayez.');
    } finally {
      setPhotoBusy('');
    }
  };

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

  const vehicleKey: VehicleType = vehicle ?? 'moto';
  const info = VEHICLES[vehicleKey];
  const displayName = userName || 'Conducteur';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'C';

  /*
   * ⚠️ AUCUNE DONNÉE FICTIVE : tout vient du store (Firestore).
   *   • Courses  → nombre réel de courses terminées du conducteur ;
   *   • Note     → moyenne des notes REÇUES (les courses notées par les clients) ;
   *   • Plaque   → compte Firestore `users/{accountId}.plate`.
   */
  const rideCount = driverRideHistory.length;

  /* Note moyenne RÉELLE des courses notées (`null` = pas encore noté). */
  const averageRating = averageRideRating(driverRideHistory);
  const ratedCount = countRatedRides(driverRideHistory);
  const roundedRating = averageRating !== null ? Math.round(averageRating) : 0;
  const plate = currentUser?.plate || '';

  const handleMenu = (key: string) => {
    if (key === 'vehicle') {
      showToast(`${info.label}${plate ? ` · ${plate}` : ''}`);
      return;
    }

    const item = MENU.find((entry) => entry.key === key);
    showToast(`${item ? item.label : 'Cette option'} — bientôt disponible`);
  };

  return (
    <Page nav="driver" background={COLORS.white}>
      <div className="driver-profile-page">

        {/* Background decoration */}
        <div className="driver-profile-orb driver-profile-orb--orange" />
        <div className="driver-profile-orb driver-profile-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="driver-profile-topbar">
          <button
            type="button"
            className="driver-profile-back"
            aria-label="Retour"
            onClick={() => navigate('/driver')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="driver-profile-brand">
            <div className="driver-profile-logo" aria-hidden="true">
              <div className="driver-profile-logo-pin">
                <Radar size={15} strokeWidth={2.6} />
              </div>
              <div className="driver-profile-logo-wheel driver-profile-logo-wheel--one" />
              <div className="driver-profile-logo-wheel driver-profile-logo-wheel--two" />
            </div>

            <div className="driver-profile-brand-text">
              <span className="driver-profile-eyebrow">Taxi Moto</span>
              <h1 className="driver-profile-title">Mon profil conducteur</h1>
            </div>
          </div>
        </header>

        {/* ===== SECTION 1 : IDENTITÉ ===== */}
        <section className="driver-profile-card">
          <div className="driver-profile-identity-row">
            {/* Photo du conducteur (identique à celle vue par le client). */}
            {photos.driverPhoto ? (
              <img
                className="driver-profile-avatar driver-profile-avatar--photo"
                src={photos.driverPhoto}
                alt={displayName}
              />
            ) : (
              <div className="driver-profile-avatar">{initial}</div>
            )}

            <div className="driver-profile-identity">
              <strong className="driver-profile-name">{displayName}</strong>
              <span className="driver-profile-phone">{phone || '+225 —'}</span>

              <div className="driver-profile-badges">
                <span
                  className={`driver-profile-badge ${
                    driverApproved ? 'driver-profile-badge--green' : 'driver-profile-badge--orange'
                  }`}
                >
                  <ShieldCheck size={12} />
                  {driverApproved ? 'Conducteur vérifié' : 'Validation en attente'}
                </span>

                <span className="driver-profile-badge driver-profile-badge--navy">
                  <Bike size={11} />
                  {info.label}
                </span>
              </div>

              {plate && <span className="driver-profile-plate">{plate}</span>}
            </div>
          </div>

          {/* ===== SECTION 2 : PHOTOS (bloc séparé, 2 colonnes) ===== */}
          <div className="driver-profile-photos">
            <label className="driver-profile-photo-btn">
              <span className="driver-profile-photo-preview driver-profile-photo-preview--round">
                {photos.driverPhoto ? (
                  <img src={photos.driverPhoto} alt="" />
                ) : (
                  <Camera size={17} />
                )}
              </span>

              <span className="driver-profile-photo-text">
                <strong>Ma photo</strong>
                <small>
                  {photoBusy === 'driver'
                    ? 'Envoi…'
                    : photos.driverPhoto
                      ? 'Changer'
                      : 'Ajouter'}
                </small>
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => void changePhoto('driver', event.target.files?.[0])}
              />
            </label>

            <label className="driver-profile-photo-btn driver-profile-photo-btn--vehicle">
              <span className="driver-profile-photo-preview driver-profile-photo-preview--square">
                {photos.vehiclePhoto ? (
                  <img src={photos.vehiclePhoto} alt="" />
                ) : (
                  <Bike size={17} />
                )}
              </span>

              <span className="driver-profile-photo-text">
                <strong>Ma moto</strong>
                <small>
                  {photoBusy === 'vehicle'
                    ? 'Envoi…'
                    : photos.vehiclePhoto
                      ? 'Changer'
                      : 'Ajouter'}
                </small>
              </span>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => void changePhoto('vehicle', event.target.files?.[0])}
              />
            </label>
          </div>

          <p className="driver-profile-photos-note">
            Ces photos sont affichées au client avant qu’il accepte votre prix.
          </p>
        </section>

        {/* ===== SECTION 3 : NOTE MOYENNE (vraies données) ===== */}
        <section className="driver-profile-rating">
          <div className="driver-profile-rating-left">
            <span className="driver-profile-rating-icon">
              <Star size={18} fill="currentColor" />
            </span>

            <div>
              <strong className="driver-profile-rating-value">
                {averageRating !== null ? averageRating.toFixed(1) : '—'}
              </strong>
              <span className="driver-profile-rating-label">Note moyenne</span>
            </div>
          </div>

          <div className="driver-profile-rating-right">
            <span className="driver-profile-rating-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  size={15}
                  fill={value <= roundedRating ? 'currentColor' : 'none'}
                />
              ))}
            </span>

            <span className="driver-profile-rating-rides">
              {averageRating === null
                ? 'Pas encore noté'
                : `${ratedCount} note${ratedCount > 1 ? 's' : ''} reçue${
                    ratedCount > 1 ? 's' : ''
                  }`}
            </span>
          </div>
        </section>

        {/* ===== SECTION 4 : STATS (vraies données) ===== */}
        <section className="driver-profile-stats">
          <div className="driver-profile-stat">
            <strong>{rideCount}</strong>
            <span>{rideCount > 1 ? 'Courses' : 'Course'}</span>
          </div>

          <div className="driver-profile-stat">
            <strong>{averageRating !== null ? averageRating.toFixed(1) : '—'}</strong>
            <span>Note moyenne</span>
          </div>

          <div className="driver-profile-stat driver-profile-stat--net">
            <strong>{fcfa(driverNet)}</strong>
            <span>Net gagné</span>
          </div>
        </section>

        {/* ===== OPTIONS ===== */}
        <nav className="driver-profile-menu">
          {MENU.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                className="driver-profile-menu-item"
                onClick={() => handleMenu(item.key)}
              >
                <span className="driver-profile-menu-icon">
                  <Icon size={19} />
                </span>

                <span className="driver-profile-menu-content">
                  <strong>{item.label}</strong>
                  <small>
                    {item.key === 'vehicle'
                      ? `${info.label}${plate ? ` · ${plate}` : ''}`
                      : item.hint}
                  </small>
                </span>

                <ChevronRight size={18} className="driver-profile-menu-chevron" />
              </button>
            );
          })}
        </nav>

        {/* ===== DÉCONNEXION ===== */}
        <button
          type="button"
          className="driver-profile-logout"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          <span className="driver-profile-logout-icon">
            <LogOut size={18} />
          </span>
          Se déconnecter
        </button>

        {toast && <div className="driver-profile-toast">{toast}</div>}
      </div>
    </Page>
  );
}
