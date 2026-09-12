import { useState } from 'react';
import { Bike, UserRound, Users } from 'lucide-react';
import { MapComponent } from '../../components/MapComponent';
import type { MapMarker } from '../../components/MapComponent';
import { ABIDJAN_CENTER, VEHICLES } from '../../theme';
import { useApp } from '../../store/useApp';
import { DRIVERS } from '../../data/mock';
import { listUsers } from '../../services/authLocal';
import './LiveMap.css';

const ONLINE_COLOR = '#009E60';
const OFFLINE_COLOR = '#8E8E93';
const CLIENT_COLOR = '#0B5FFF';

/** Position simulée autour d'Abidjan (déterministe, sans dépendance externe). */
function offsetPosition(index: number, spread: number): [number, number] {
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = (0.012 + (index % 5) * 0.006) * spread;
  return [
    ABIDJAN_CENTER[0] + Math.sin(angle) * radius,
    ABIDJAN_CENTER[1] + Math.cos(angle) * radius,
  ];
}

export default function LiveMap() {
  const { adminDrivers } = useApp();
  const [passengers] = useState(() => listUsers().filter((user) => user.role === 'passenger'));

  const driverMarkers: MapMarker[] = DRIVERS.map((driver, index) => ({
    id: driver.id,
    position: offsetPosition(index + 1, 1),
    emoji: VEHICLES[driver.vehicle].emoji,
    label: `${driver.name} · ${driver.zone}`,
    color: driver.online ? ONLINE_COLOR : OFFLINE_COLOR,
    badge: driver.online ? 'En ligne' : 'Hors ligne',
    rating: driver.rating,
  }));

  const clientMarkers: MapMarker[] = passengers.map((user, index) => ({
    id: user.id,
    position: offsetPosition(index + 3, 1.6),
    emoji: '👤',
    label: user.name,
    color: CLIENT_COLOR,
    badge: 'Client',
  }));

  const markers = [...driverMarkers, ...clientMarkers];

  const driversOnline = adminDrivers.filter((driver) => driver.online).length;
  const driversOffline = adminDrivers.length - driversOnline;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Carte live</h1>
          <p className="admin-page-subtitle">
            {driversOnline} conducteur{driversOnline > 1 ? 's' : ''} en ligne ·{' '}
            {passengers.length} client{passengers.length > 1 ? 's' : ''} connecté
            {passengers.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <section className="admin-live-map">
        <div className="admin-live-map-canvas">
          <MapComponent
            center={ABIDJAN_CENTER}
            zoom={12}
            me={false}
            zoneRadius={0}
            markers={markers}
          />

          <div className="admin-live-legend">
            <span className="admin-live-legend-item">
              <span className="admin-live-dot" style={{ background: ONLINE_COLOR }} />
              Conducteur en ligne
            </span>
            <span className="admin-live-legend-item">
              <span className="admin-live-dot" style={{ background: OFFLINE_COLOR }} />
              Conducteur hors ligne
            </span>
            <span className="admin-live-legend-item">
              <span className="admin-live-dot" style={{ background: CLIENT_COLOR }} />
              Client
            </span>
          </div>
        </div>

        <aside className="admin-live-panel">
          <div className="admin-live-panel-head">
            <Users size={16} />
            <strong>Connectés</strong>
            <span className="admin-muted">{markers.length}</span>
          </div>

          <div className="admin-live-group">
            <span className="admin-live-group-title">
              <Bike size={13} /> Conducteurs ({driversOnline} en ligne / {driversOffline} hors ligne)
            </span>

            {DRIVERS.map((driver) => (
              <div key={driver.id} className="admin-live-row">
                <span
                  className="admin-live-dot"
                  style={{ background: driver.online ? ONLINE_COLOR : OFFLINE_COLOR }}
                />
                <span className="admin-live-name">
                  {VEHICLES[driver.vehicle].emoji} {driver.name}
                </span>
                <span className={`admin-pill admin-pill--${driver.online ? 'green' : 'gray'}`}>
                  {driver.online ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
            ))}
          </div>

          <div className="admin-live-group">
            <span className="admin-live-group-title">
              <UserRound size={13} /> Clients ({passengers.length})
            </span>

            {passengers.length === 0 ? (
              <p className="admin-live-empty">Aucun client connecté.</p>
            ) : (
              passengers.map((user) => (
                <div key={user.id} className="admin-live-row">
                  <span className="admin-live-dot" style={{ background: CLIENT_COLOR }} />
                  <span className="admin-live-name">{user.name}</span>
                  <span className="admin-muted">{user.phone}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </>
  );
}
