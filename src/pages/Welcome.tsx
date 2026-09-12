import { useState } from 'react';
import {
  ArrowRight,
  Bike,
  Car,
  ChevronRight,
  Headphones,
  MapPin,
  MapPinned,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/Page';
import { COLORS, VEHICLES } from '../theme';
import { useApp } from '../store/useApp';
import { DESTINATIONS } from '../data/mock';
import type { VehicleType } from '../types';
import './Welcome.css';

const ADVANTAGES = [
  { icon: ShieldCheck, title: 'Sécurisé', text: 'Conducteurs vérifiés', tone: 'blue' },
  { icon: Zap, title: 'Rapide', text: 'En quelques minutes', tone: 'orange' },
  { icon: MapPinned, title: 'Partout', text: "En Côte d'Ivoire", tone: 'green' },
  { icon: Headphones, title: 'Assistance', text: 'Toujours à votre écoute', tone: 'blue' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { role, vehicle, setVehicle, destination, setDestination, setDistanceKm } = useApp();

  // Fallback visuel : si un visuel PNG ne charge pas, on garde le badge blanc
  // (fond gris clair + icône véhicule) au lieu du rectangle blanc cassé.
  const [brokenVehicles, setBrokenVehicles] = useState<Record<VehicleType, boolean>>({
    moto: false,
    tricycle: false,
  });

  const pickDestination = (name: string) => {
    setDestination(name);
    const found = DESTINATIONS.find((item) => item.name === name);
    setDistanceKm(found ? found.distanceKm : 0);
  };

  const start = () => {
    if (role === 'guest') {
      navigate('/register/passenger');
      return;
    }
    navigate('/passenger');
  };

  const chooseVehicle = (key: VehicleType) => {
    setVehicle(key);
    start();
  };

  return (
    <Page background={COLORS.white}>
      <div className="welcome-page">

        {/* ===== 1. HERO ===== */}
        <section className="welcome-hero">
          <div className="welcome-hero-media">
            <img
              className="welcome-hero-img"
              src="/images/abidjan-hero.jpg"
              alt="Abidjan, Côte d'Ivoire"
            />
            <div className="welcome-hero-overlay" />
          </div>

          <header className="welcome-hero-top">
            <div className="welcome-brand">
              <img className="welcome-logo-img" src="/images/logo.png" alt="Taxi-Moto" />
            </div>

            <div className="welcome-country">
              <MapPin size={13} />
              Côte d'Ivoire
            </div>
          </header>

          <div className="welcome-hero-bottom">
            <h1>Abidjan</h1>
            <p className="welcome-hero-sub">et partout en Côte d'Ivoire</p>
            <p className="welcome-hero-tagline">
              Le transport de proximité, simplement.
            </p>
          </div>
        </section>

        {/* ===== 2. VEHICULES ===== */}
        <section className="welcome-sheet">
          <div className="welcome-eyebrow">
            <span className="welcome-eyebrow-bar" />
            Trouvez votre course en quelques clics
          </div>

          <h2 className="welcome-title">Choisissez votre véhicule</h2>

          <div className="welcome-vehicles">

            <button
              type="button"
              className={`welcome-vcard welcome-vcard--tricycle ${
                vehicle === 'tricycle' ? 'welcome-vcard--active' : ''
              }`}
              onClick={() => chooseVehicle('tricycle')}
            >
              <div className="welcome-vcard-media">
                <div
                  className={`welcome-vcard-photo ${
                    brokenVehicles.tricycle ? 'welcome-vcard-photo--fallback' : ''
                  }`}
                >
                  {brokenVehicles.tricycle ? (
                    <Car size={34} strokeWidth={1.9} />
                  ) : (
                    <img
                      className="welcome-vcard-img"
                      src="/images/tricycle.jpg"
                      alt="Tricycle"
                      onError={() =>
                        setBrokenVehicles((prev) => ({ ...prev, tricycle: true }))
                      }
                    />
                  )}
                </div>
              </div>

              <div className="welcome-vcard-body">
                <strong>{VEHICLES.tricycle.label}</strong>
                <small>{VEHICLES.tricycle.description}</small>
              </div>

              <div className="welcome-vcard-foot">
                <span className="welcome-vcard-icon">
                  <UsersRound size={18} />
                </span>
                <span className="welcome-vcard-go">
                  <ArrowRight size={18} />
                </span>
              </div>
            </button>

            <button
              type="button"
              className={`welcome-vcard welcome-vcard--moto ${
                vehicle === 'moto' ? 'welcome-vcard--active' : ''
              }`}
              onClick={() => chooseVehicle('moto')}
            >
              <div className="welcome-vcard-media">
                <div
                  className={`welcome-vcard-photo ${
                    brokenVehicles.moto ? 'welcome-vcard-photo--fallback' : ''
                  }`}
                >
                  {brokenVehicles.moto ? (
                    <Bike size={34} strokeWidth={1.9} />
                  ) : (
                    <img
                      className="welcome-vcard-img"
                      src="/images/moto.jpg"
                      alt="Moto"
                      onError={() =>
                        setBrokenVehicles((prev) => ({ ...prev, moto: true }))
                      }
                    />
                  )}
                </div>
              </div>

              <div className="welcome-vcard-body">
                <strong>{VEHICLES.moto.label}</strong>
                <small>{VEHICLES.moto.description}</small>
              </div>

              <div className="welcome-vcard-foot">
                <span className="welcome-vcard-icon">
                  <UserRound size={18} />
                </span>
                <span className="welcome-vcard-go">
                  <ArrowRight size={18} />
                </span>
              </div>
            </button>

          </div>
        </section>

        {/* ===== 3. POSITION & DESTINATION ===== */}
        <section className="welcome-route">

          <div className="welcome-row">
            <div className="welcome-row-icon">
              <MapPin size={18} />
            </div>
            <div className="welcome-row-content">
              <strong>Ma position actuelle</strong>
              <span>Appuyez pour définir votre position</span>
            </div>
            <ChevronRight size={18} className="welcome-row-chevron" />
          </div>

          <div className="welcome-row welcome-row--interactive">
            <div className="welcome-row-icon">
              <MapPin size={18} />
            </div>
            <div className="welcome-row-content">
              <strong>Destination</strong>
              <span>{destination || 'Où allez-vous ?'}</span>
            </div>
            <ChevronRight size={18} className="welcome-row-chevron" />

            <select
              className="welcome-row-select"
              aria-label="Choisir une destination"
              value={destination}
              onChange={(event) => pickDestination(event.target.value)}
            >
              <option value="">Où allez-vous ?</option>
              {DESTINATIONS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} · {item.distanceKm} km
                </option>
              ))}
            </select>
          </div>

        </section>

        {/* ===== 4. AVANTAGES ===== */}
        <section className="welcome-features">
          {ADVANTAGES.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="welcome-feature">
                <div className={`welcome-feature-icon welcome-feature-icon--${item.tone}`}>
                  <Icon size={18} />
                </div>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            );
          })}
        </section>

        {/* ===== 5. DEVENIR CONDUCTEUR ===== */}
        <button
          type="button"
          className="welcome-driver"
          onClick={() => navigate('/register/driver')}
        >
          <span className="welcome-driver-icon">
            <UserPlus size={22} />
          </span>

          <span className="welcome-driver-content">
            <strong>Devenir conducteur</strong>
            <small>Rejoignez notre réseau et gagnez vos revenus</small>
          </span>

          <span className="welcome-driver-arrow">
            <ArrowRight size={20} />
          </span>
        </button>

      </div>
    </Page>
  );
}
