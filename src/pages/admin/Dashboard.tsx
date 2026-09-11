import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, COMMISSION_RATE, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { ADMIN_RIDES } from '../../data/mock';

const STATUS_LABELS: Record<string, string> = {
  idle: 'EN ATTENTE',
  searching: 'RECHERCHE CONDUCTEUR',
  offers: 'OFFRES ENVOYÉES',
  driver_found: 'CONDUCTEUR TROUVÉ',
  driver_arriving: 'CONDUCTEUR EN ROUTE',
  driver_arrived: 'CONDUCTEUR ARRIVÉ',
  in_progress: 'COURSE EN COURS',
  completed: 'TERMINÉE',
  cancelled: 'ANNULÉE',
};

const STATUS_COLORS: Record<string, string> = {
  completed: COLORS.green,
  cancelled: COLORS.red,
  in_progress: COLORS.blue,
  searching: COLORS.orange,
  offers: COLORS.orange,
  driver_found: COLORS.blue,
  driver_arriving: COLORS.blue,
  driver_arrived: COLORS.blue,
  idle: COLORS.gray,
};

const panel = {
  backgroundColor: COLORS.white,
  borderRadius: 20,
  padding: 20,
  marginTop: 18,
} as const;

const th: CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: COLORS.gray,
  textAlign: 'left',
};

const td: CSSProperties = {
  padding: '12px',
  fontSize: 13,
  color: COLORS.navy,
  verticalAlign: 'middle',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { adminStats, zoneRules, updateZoneRule, adminDrivers, toggleDriverStatus } = useApp();

  const stats = [
    { label: 'Passagers', value: adminStats.passengers.toLocaleString('fr-FR'), icon: '🧍' },
    { label: 'Conducteurs', value: adminStats.drivers.toString(), icon: '🛺' },
    { label: 'Conducteurs en ligne', value: adminStats.driversOnline.toString(), icon: '🟢' },
    { label: 'Courses aujourd’hui', value: adminStats.ridesToday.toString(), icon: '📅' },
    { label: 'Courses en cours', value: adminStats.ridesActive.toString(), icon: '⏱️' },
    { label: 'Courses terminées', value: adminStats.ridesCompleted.toString(), icon: '✅' },
    { label: 'Chiffre généré', value: fcfa(adminStats.revenue), icon: '💰' },
    {
      label: `Commission ${Math.round(COMMISSION_RATE * 100)} %`,
      value: fcfa(Math.round(adminStats.revenue * COMMISSION_RATE)),
      icon: '🏦',
    },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', backgroundColor: '#EEF1F7' }}>
      <div
        style={{
          backgroundColor: COLORS.navy,
          color: COLORS.white,
          padding: '22px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Taxi-Moto · Administration</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Supervision temps réel · Côte d’Ivoire 🇨🇮
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            padding: '12px 20px',
            borderRadius: 14,
            border: 'none',
            backgroundColor: COLORS.orange,
            color: COLORS.white,
            fontWeight: 700,
            fontFamily: 'inherit',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Quitter
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 28 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 14,
          }}
        >
          {stats.map((item) => (
            <div
              key={item.label}
              style={{ backgroundColor: COLORS.white, borderRadius: 18, padding: 16 }}
            >
              <div style={{ fontSize: 20 }}>{item.icon}</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: COLORS.navy, marginTop: 6 }}>
                {item.value}
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.navy }}>
              Gestion des conducteurs
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>
              {adminDrivers.filter((driver) => driver.online).length} en ligne · Moto / Tricycle
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Conducteur</th>
                  <th style={th}>Véhicule</th>
                  <th style={th}>Zone</th>
                  <th style={th}>Note</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminDrivers.map((driver) => (
                  <tr key={driver.id} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{driver.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.gray }}>{driver.plate}</div>
                    </td>
                    <td style={td}>
                      {VEHICLES[driver.vehicle].emoji} {VEHICLES[driver.vehicle].label}
                    </td>
                    <td style={td}>{driver.zone}</td>
                    <td style={td}>⭐ {driver.rating}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: driver.online ? COLORS.green : COLORS.gray,
                        }}
                      >
                        {driver.online ? '🟢 En ligne' : '⚪ Hors ligne'}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() => toggleDriverStatus(driver.id)}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 12,
                          border: 'none',
                          fontFamily: 'inherit',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: driver.online ? '#FDEBEC' : '#E9F7F1',
                          color: driver.online ? COLORS.red : COLORS.green,
                        }}
                      >
                        {driver.online ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={panel}>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.navy }}>
            Règles tarifaires par zone
          </div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
            Le conducteur propose son prix (minimum 1 000 FCFA). L’admin encadre par zone et suit
            les prix réellement observés.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Zone</th>
                  <th style={th}>Minimum (FCFA)</th>
                  <th style={th}>Tarif généralement observé</th>
                  <th style={th}>Courses</th>
                  <th style={th}>Prix moyen</th>
                </tr>
              </thead>
              <tbody>
                {zoneRules.map((rule) => (
                  <tr key={rule.zone} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}>
                    <td style={td}>{rule.zone}</td>
                    <td style={td}>
                      <input
                        type="number"
                        value={rule.min}
                        onChange={(event) =>
                          updateZoneRule(rule.zone, { min: Number(event.target.value) })
                        }
                        style={{
                          width: 96,
                          padding: '9px 12px',
                          borderRadius: 12,
                          border: `1px solid ${COLORS.grayLight}`,
                          backgroundColor: COLORS.grayLight,
                          fontFamily: 'inherit',
                          fontSize: 13,
                          fontWeight: 700,
                          color: COLORS.navy,
                          outline: 'none',
                        }}
                      />
                    </td>
                    <td style={td}>{rule.observed}</td>
                    <td style={td}>{rule.courses.toLocaleString('fr-FR')}</td>
                    <td style={td}>{fcfa(rule.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.navy }}>
              Courses en temps réel
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>
              {ADMIN_RIDES.length} courses suivies
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, minWidth: 940 }}
            >
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Passager</th>
                  <th style={th}>Conducteur</th>
                  <th style={th}>Véhicule</th>
                  <th style={th}>Trajet</th>
                  <th style={th}>Distance</th>
                  <th style={th}>Prix</th>
                  <th style={th}>Commission</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_RIDES.map((ride) => (
                  <tr key={ride.id} style={{ borderTop: `1px solid ${COLORS.grayLight}` }}>
                    <td style={td}>{ride.id}</td>
                    <td style={td}>{ride.passengerName}</td>
                    <td style={td}>{ride.driverName}</td>
                    <td style={td}>
                      {VEHICLES[ride.vehicle].emoji} {VEHICLES[ride.vehicle].label}
                    </td>
                    <td style={td}>
                      {ride.pickup} → {ride.destination}
                    </td>
                    <td style={td}>{ride.distanceKm} km</td>
                    <td style={td}>{ride.price ? fcfa(ride.price) : '—'}</td>
                    <td style={td}>{ride.commission ? fcfa(ride.commission) : '—'}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: STATUS_COLORS[ride.status] ?? COLORS.gray,
                        }}
                      >
                        {STATUS_LABELS[ride.status] ?? ride.status}
                      </span>
                    </td>
                    <td style={td}>
                      {ride.date} · {ride.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
}
