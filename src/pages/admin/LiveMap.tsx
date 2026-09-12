import { useState } from 'react';
import { Bike, UserRound, Users } from 'lucide-react';
import { MapComponent } from '../../components/MapComponent';
import type { MapMarker } from '../../components/MapComponent';
import { ABIDJAN_CENTER, VEHICLES } from '../../theme';
import { listDrivers, listPassengers } from '../../services/authLocal';
import './LiveMap.css';

const ONLINE_COLOR = '#009E60';
const OFFLINE_COLOR = '#8E8E93';
const CLIENT_COLOR = '#0B5FFF';

export default function LiveMap() {
  const [drivers] = useState(() => listDrivers());
  const [passengers] = useState(() => listPassengers());

  /*
   * Aucune position réelle n'est disponible pour l'instant : la géolocalisation
   * sera branchée plus tard. La carte reste donc vide (zone d'Abidjan seule)
   * tant qu'aucune position confirmée n'existe — aucune position fictive.
   */
  const markers: MapMarker[] = [];

  const driversActive = drivers.filter((driver) => !driver.blocked).length;
  const driversSuspended = drivers.length - driversActive;

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Carte live</h1>
          <p className="admin-page-subtitle">
            {drivers.length} conducteur{drivers.length > 1 ? 's' : ''} · {passengers.length} client
            {passengers.length > 1 ? 's' : ''} · positions à venir
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
            <strong>Comptes inscrits</strong>
            <span className="admin-muted">{drivers.length + passengers.length}</span>
          </div>

          <div className="admin-live-group">
            <span className="admin-live-group-title">
              <Bike size={13} /> Conducteurs ({driversActive} actifs / {driversSuspended} suspendus)
            </span>

            {drivers.length === 0 ? (
              <p className="admin-live-empty">Aucun conducteur inscrit.</p>
            ) : (
              drivers.map((driver) => (
                <div key={driver.id} className="admin-live-row">
                  <span
                    className="admin-live-dot"
                    style={{ background: driver.blocked ? OFFLINE_COLOR : ONLINE_COLOR }}
                  />
                  <span className="admin-live-name">
                    {VEHICLES[driver.vehicle ?? 'moto'].emoji} {driver.name}
                  </span>
                  <span
                    className={`admin-pill admin-pill--${driver.blocked ? 'red' : 'green'}`}
                  >
                    {driver.blocked ? 'Suspendu' : 'Actif'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="admin-live-group">
            <span className="admin-live-group-title">
              <UserRound size={13} /> Clients ({passengers.length})
            </span>

            {passengers.length === 0 ? (
              <p className="admin-live-empty">Aucun client inscrit.</p>
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

          <p className="admin-live-empty">
            Les positions GPS s'afficheront ici quand la géolocalisation réelle sera branchée.
          </p>
        </aside>
      </section>
    </>
  );
}
