import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  Car,
  ChevronRight,
  MapPin,
  Minus,
  Navigation,
  Plus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { MapComponent } from '../../components/MapComponent';
import type { MapMarker } from '../../components/MapComponent';
import { ABIDJAN_CENTER, COLORS, VEHICLES, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { useGeolocation } from '../../hooks/useGeolocation';
import { DESTINATIONS_HORS_ZONE } from '../../data/mock';
import {
  DISTANCE_ZONE_MOYENNE_KM,
  QUARTIERS_PAR_SECTEUR,
  findQuartierById,
  labelQuartier,
} from '../../data/quartiers';
import { resolveCoverage } from '../../data/coverage';
import type { VehicleType } from '../../types';
import './Home.css';

const MAX_PASSENGERS = 4;

/** Valeur du sélecteur pour « Autre destination » (recherche libre). */
const AUTRE_DESTINATION = '__autre__';

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.jpg',
  tricycle: '/images/tricycle.jpg',
};

/** Message d'accueil dynamique selon l'heure (avant 12h · 12h–18h · après 18h). */
function getGreeting(): string {
  const hours = new Date().getHours();

  if (hours < 12) return 'Bonjour';
  if (hours < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function PassengerHome() {
  const navigate = useNavigate();
  const {
    userName,
    passengers,
    setPassengers,
    vehicle,
    setVehicle,
    destination,
    destinationId,
    destinationLibre,
    setDestinationLieu,
    distanceKm,
    setDistanceKm,
    startSearch,
    setPassengerPosition,
  } = useApp();

  // Fallback visuel : si un visuel véhicule ne charge pas, le badge reste
  // (fond gris clair + icône véhicule) au lieu d'un rectangle blanc cassé.
  const [brokenVehicles, setBrokenVehicles] = useState<Record<VehicleType, boolean>>({
    moto: false,
    tricycle: false,
  });

  /* Aucun conducteur fictif : la carte n'affiche que les vraies positions
     (aucune pour l'instant — la géolocalisation réelle arrivera plus tard). */
  const markers: MapMarker[] = [];

  /* Géolocalisation réelle du client (watch continu). */
  const geo = useGeolocation({ onUpdate: (position) => setPassengerPosition(position) });

  const mapCenter: [number, number] = geo.position
    ? [geo.position.latitude, geo.position.longitude]
    : ABIDJAN_CENTER;

  const showGeoBanner = geo.permission !== 'granted' || Boolean(geo.error);

  const estimate = distanceKm > 0 ? estimateFare(distanceKm) : null;
  const motoAllowed = passengers <= VEHICLES.moto.max;

  /* Destination : base de quartiers (zone couverte) ou saisie libre. */
  const [autreSelected, setAutreSelected] = useState(false);
  const [lieuLibre, setLieuLibre] = useState('');

  /**
   * Sélection dans la liste : quartier couvert (valeur = slug du quartier),
   * ville hors zone (valeur = nom), ou saisie libre.
   */
  const pickDestination = (value: string) => {
    if (value === AUTRE_DESTINATION) {
      setAutreSelected(true);
      setLieuLibre('');
      setDestinationLieu({ nom: '', libre: true });
      setDistanceKm(0);
      return;
    }

    setAutreSelected(false);
    setLieuLibre('');

    // 1) Quartier de la base (identifié par son slug) → zone couverte.
    const quartier = findQuartierById(value);

    if (quartier) {
      setDestinationLieu({
        id: quartier.id,
        nom: labelQuartier(quartier),
        secteur: quartier.secteur,
      });
      setDistanceKm(DISTANCE_ZONE_MOYENNE_KM);
      return;
    }

    // 2) Ville hors zone (Bingerville, Grand-Bassam…) → commande refusée.
    const horsZone = DESTINATIONS_HORS_ZONE.find((item) => item.name === value);
    setDestinationLieu({ nom: value });
    setDistanceKm(horsZone ? horsZone.distanceKm : DISTANCE_ZONE_MOYENNE_KM);
  };

  /** Saisie libre : acceptée même si le lieu n'est pas dans la base. */
  const changeLieuLibre = (value: string) => {
    setLieuLibre(value);

    const trimmed = value.trim();
    setDestinationLieu({ nom: trimmed, libre: true });
    setDistanceKm(trimmed ? DISTANCE_ZONE_MOYENNE_KM : 0);
  };

  const changePassengers = (delta: number) => {
    setPassengers(Math.min(MAX_PASSENGERS, Math.max(1, passengers + delta)));
  };

  const order = () => {
    if (!destination || !vehicle) return;

    /*
     * Couverture décidée par le SLUG du quartier (puis libellé normalisé /
     * saisie libre) — jamais par une comparaison de texte fragile.
     */
    const coverage = resolveCoverage({
      id: destinationId,
      nom: destination,
      libre: destinationLibre,
    });

    if (!coverage.covered) {
      navigate('/passenger/unavailable', { state: { reason: 'zone' } });
      return;
    }

    // Zone couverte : on cherche un conducteur réellement disponible.
    const available = startSearch();
    navigate(
      available ? '/passenger/search' : '/passenger/unavailable',
      available ? undefined : { state: { reason: 'no-driver' } },
    );
  };

  const canOrder = Boolean(destination && vehicle);

  return (
    <Page nav="passenger" scroll={false} background={COLORS.grayLight}>
      <div className="home-page">

        {/* ===== CARTE ===== */}
        <div className="home-map">
          <MapComponent center={mapCenter} markers={markers} zoneRadius={2000} />
        </div>

        {/* ===== BANDEAU GÉOLOCALISATION ===== */}
        {showGeoBanner && (
          <div className="geo-banner">
            <span className="geo-banner-icon">
              <MapPin size={18} />
            </span>

            <span className="geo-banner-text">
              {geo.supported
                ? 'Activez la géolocalisation pour que le chauffeur vous trouve'
                : 'Géolocalisation non supportée par ce navigateur'}
            </span>

            {geo.supported && (
              <button
                type="button"
                className="geo-banner-btn"
                onClick={() => {
                  void geo.requestPermission();
                }}
              >
                Activer
              </button>
            )}
          </div>
        )}

        {/* ===== HEADER ===== */}
        <header className="home-topbar">
          <div className="home-brand">
            <div className="home-logo">
              <div className="home-logo-pin">
                <MapPin size={15} strokeWidth={2.8} />
              </div>
              <div className="home-logo-wheel home-logo-wheel--one" />
              <div className="home-logo-wheel home-logo-wheel--two" />
            </div>

            <div className="home-brand-text">
              <span className="home-brand-hello">{getGreeting()}</span>
              <strong className="home-brand-name">{userName || 'Passager'} 👋</strong>
            </div>
          </div>

          <div className="home-topbar-right">
            <span className="home-country">🇨🇮 Abidjan</span>

            <button
              type="button"
              className="home-profile"
              aria-label="Mon profil"
              onClick={() => navigate('/passenger/profile')}
            >
              <UserRound size={19} />
            </button>
          </div>
        </header>

        {/* ===== SHEET ===== */}
        <section className="home-sheet">
          <span className="home-sheet-handle" />

          <h1 className="home-sheet-title">Où allez-vous ?</h1>

          {/* Itinéraire */}
          <div className="home-route">
            <div className="home-route-row">
              <span className="home-route-icon home-route-icon--pickup">
                <Navigation size={17} />
              </span>

              <div className="home-route-content">
                <strong>Ma position actuelle</strong>
                <span>Appuyez pour définir votre position</span>
              </div>

              <ChevronRight size={18} className="home-route-chevron" />
            </div>

            <div className="home-route-row home-route-row--interactive">
              <span className="home-route-icon home-route-icon--dest">
                <MapPin size={17} />
              </span>

              <div className="home-route-content">
                <strong>Destination</strong>
                <span>
                  {destination ||
                    (autreSelected
                      ? 'Saisissez le nom du lieu'
                      : 'Choisissez une destination')}
                </span>
              </div>

              <ChevronRight size={18} className="home-route-chevron" />

              <select
                className="home-route-select"
                aria-label="Choisir une destination"
                value={autreSelected ? AUTRE_DESTINATION : destinationId || destination}
                onChange={(event) => pickDestination(event.target.value)}
              >
                <option value="">Choisir une destination</option>

                {QUARTIERS_PAR_SECTEUR.map(({ secteur, quartiers }) => (
                  <optgroup key={secteur} label={`Zone couverte · ${secteur}`}>
                    {quartiers.map((quartier) => (
                      <option key={quartier.id} value={quartier.id}>
                        {labelQuartier(quartier)}
                      </option>
                    ))}
                  </optgroup>
                ))}

                <optgroup label="Hors zone · non couvert">
                  {DESTINATIONS_HORS_ZONE.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>

                <option value={AUTRE_DESTINATION}>Autre destination (saisir…)</option>
              </select>
            </div>
          </div>

          {/* Destination libre (hors base) */}
          {autreSelected && (
            <div className="home-free">
              <label className="home-free-label" htmlFor="home-free-input">
                Entrez le nom du quartier ou lieu
              </label>

              <div className="home-free-field">
                <MapPin size={16} className="home-free-icon" />

                <input
                  id="home-free-input"
                  className="home-free-input"
                  type="text"
                  autoComplete="off"
                  placeholder="Ex. Modeste, China Mall, Pharmacie du carrefour"
                  value={lieuLibre}
                  onChange={(event) => changeLieuLibre(event.target.value)}
                />
              </div>

              <p className="home-free-note">
                Si le chauffeur ne trouve pas, il vous appellera pour négocier.
              </p>
            </div>
          )}

          {/* Passagers */}
          <div className="home-section-label">
            <UsersRound size={14} />
            Combien êtes-vous ?
          </div>

          <div className="home-stepper">
            <button
              type="button"
              className="home-stepper-btn"
              aria-label="Retirer un passager"
              onClick={() => changePassengers(-1)}
              disabled={passengers <= 1}
            >
              <Minus size={18} />
            </button>

            <div className="home-stepper-value">
              <strong>{passengers}</strong>
              <span>{passengers > 1 ? 'passagers' : 'passager'}</span>
            </div>

            <button
              type="button"
              className="home-stepper-btn"
              aria-label="Ajouter un passager"
              onClick={() => changePassengers(1)}
              disabled={passengers >= MAX_PASSENGERS}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Véhicules */}
          <div className="home-vehicles">
            {(['moto', 'tricycle'] as const).map((key) => {
              const allowed = key === 'moto' ? motoAllowed : true;
              const active = vehicle === key;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!allowed}
                  onClick={() => setVehicle(key)}
                  className={`home-vcard home-vcard--${key} ${
                    active ? 'home-vcard--active' : ''
                  }`}
                >
                  <div
                    className={`home-vcard-photo ${
                      brokenVehicles[key] ? 'home-vcard-photo--fallback' : ''
                    }`}
                  >
                    {brokenVehicles[key] ? (
                      key === 'moto' ? (
                        <Bike size={30} strokeWidth={1.9} />
                      ) : (
                        <Car size={30} strokeWidth={1.9} />
                      )
                    ) : (
                      <img
                        className="home-vcard-img"
                        src={VEHICLE_IMAGES[key]}
                        alt={VEHICLES[key].label}
                        onError={() =>
                          setBrokenVehicles((prev) => ({ ...prev, [key]: true }))
                        }
                      />
                    )}
                  </div>

                  <strong className="home-vcard-label">{VEHICLES[key].label}</strong>
                  <small className="home-vcard-desc">
                    {allowed ? VEHICLES[key].description : 'Capacité insuffisante'}
                  </small>

                  {active && <span className="home-vcard-check">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Estimation */}
          {estimate && (
            <div className="home-estimate">
              <div className="home-estimate-head">
                <span>Estimation Taxi-Moto</span>
                <span className="home-estimate-range">
                  {fcfa(estimate.min)} – {fcfa(estimate.max)}
                </span>
              </div>

              <div className="home-estimate-rows">
                <div className="home-estimate-row">
                  <span>Prix minimum</span>
                  <strong>{fcfa(estimate.min)}</strong>
                </div>

                <div className="home-estimate-row">
                  <span>Distance</span>
                  <strong>{distanceKm} km</strong>
                </div>

                <div className="home-estimate-row home-estimate-row--total">
                  <span>Prix total estimé</span>
                  <strong>{fcfa(estimate.max)}</strong>
                </div>
              </div>

              {destinationLibre ? (
                <p className="home-estimate-note">
                  Lieu hors base : estimation sur une distance moyenne. Le chauffeur vous
                  appellera pour confirmer le lieu et le prix.
                </p>
              ) : (
                <p className="home-estimate-note">
                  Le prix final est proposé par le chauffeur.
                </p>
              )}
            </div>
          )}

          {/* Commander */}
          <button
            type="button"
            className="home-order"
            onClick={order}
            disabled={!canOrder}
          >
            <span className="home-order-content">
              Commander
              <small>
                {canOrder && vehicle
                  ? `Course ${VEHICLES[vehicle].label} · ${passengers} ${
                      passengers > 1 ? 'passagers' : 'passager'
                    }`
                  : 'Choisissez une destination et un véhicule'}
              </small>
            </span>

            <span className="home-order-arrow">
              <ArrowRight size={20} />
            </span>
          </button>

        </section>

      </div>
    </Page>
  );
}
