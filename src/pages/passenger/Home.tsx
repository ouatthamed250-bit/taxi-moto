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
import { DESTINATIONS, DRIVERS } from '../../data/mock';
import type { VehicleType } from '../../types';
import './Home.css';

const MAX_PASSENGERS = 4;

const VEHICLE_IMAGES: Record<VehicleType, string> = {
  moto: '/images/moto.png',
  tricycle: '/images/tricycle.png',
};

/** Message d'accueil dynamique selon l'heure (avant 12h · 12h–18h · après 18h). */
function getGreeting(): string {
  const hours = new Date().getHours();

  if (hours < 12) return 'Bonjour';
  if (hours < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

/** Distance approximative (km, 1 décimale) entre deux points — pour l'affichage. */
function distanceKmFrom(from: [number, number], to: [number, number]): number {
  const earthRadiusKm = 6371;
  const dLat = ((to[0] - from[0]) * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from[0] * Math.PI) / 180) *
      Math.cos((to[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(a)) * 10) / 10;
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
    setDestination,
    distanceKm,
    setDistanceKm,
    startSearch,
  } = useApp();

  // Fallback visuel : si un visuel véhicule ne charge pas, le badge reste
  // (fond gris clair + icône véhicule) au lieu d'un rectangle blanc cassé.
  const [brokenVehicles, setBrokenVehicles] = useState<Record<VehicleType, boolean>>({
    moto: false,
    tricycle: false,
  });

  const markers: MapMarker[] = DRIVERS.filter((driver) => driver.online).map((driver, index) => {
    const position: [number, number] = [
      ABIDJAN_CENTER[0] + (index - 1) * 0.009,
      ABIDJAN_CENTER[1] + (index - 1) * 0.011,
    ];

    return {
      id: driver.id,
      position,
      emoji: VEHICLES[driver.vehicle].emoji,
      label: driver.name,
      color: driver.vehicle === 'moto' ? COLORS.orange : COLORS.green,
      badge: VEHICLES[driver.vehicle].label,
      rating: driver.rating,
      distanceKm: distanceKmFrom(ABIDJAN_CENTER, position),
    };
  });

  const selected = DESTINATIONS.find((item) => item.name === destination);
  const estimate = distanceKm > 0 ? estimateFare(distanceKm) : null;
  const motoAllowed = passengers <= VEHICLES.moto.max;

  const pickDestination = (name: string) => {
    setDestination(name);
    const found = DESTINATIONS.find((item) => item.name === name);
    setDistanceKm(found ? found.distanceKm : 0);
  };

  const changePassengers = (delta: number) => {
    setPassengers(Math.min(MAX_PASSENGERS, Math.max(1, passengers + delta)));
  };

  const order = () => {
    if (!destination || !vehicle) return;
    if (selected && !selected.covered) {
      navigate('/passenger/unavailable');
      return;
    }
    startSearch();
    navigate('/passenger/search');
  };

  const canOrder = Boolean(destination && vehicle);

  return (
    <Page nav="passenger" scroll={false} background={COLORS.grayLight}>
      <div className="home-page">

        {/* ===== CARTE ===== */}
        <div className="home-map">
          <MapComponent center={ABIDJAN_CENTER} markers={markers} zoneRadius={2000} />
        </div>

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
                <span>{destination || 'Choisissez une destination'}</span>
              </div>

              <ChevronRight size={18} className="home-route-chevron" />

              <select
                className="home-route-select"
                aria-label="Choisir une destination"
                value={destination}
                onChange={(event) => pickDestination(event.target.value)}
              >
                <option value="">Choisir une destination</option>
                {DESTINATIONS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} · {item.distanceKm} km
                  </option>
                ))}
              </select>
            </div>
          </div>

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

              <p className="home-estimate-note">
                Le prix final est proposé par le chauffeur.
              </p>
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
