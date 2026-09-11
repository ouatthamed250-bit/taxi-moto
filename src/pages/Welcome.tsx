import { MapPinned, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/Page';
import { COLORS, VEHICLES } from '../theme';
import { useApp } from '../store/useApp';
import { DESTINATIONS } from '../data/mock';
import type { VehicleType } from '../types';

const ADVANTAGES = [
  { icon: ShieldCheck, label: 'Conducteurs vérifiés' },
  { icon: Navigation, label: 'Rapide' },
  { icon: MapPinned, label: 'Selon votre zone' },
  { icon: Phone, label: 'Assistance' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { role, vehicle, setVehicle, destination, setDestination, setDistanceKm } = useApp();

  const pickDestination = (name: string) => {
    setDestination(name);
    const found = DESTINATIONS.find((item) => item.name === name);
    setDistanceKm(found ? found.distanceKm : 0);
  };

  const start = () => {
    if (role === 'guest') {
      navigate('/login');
      return;
    }
    navigate('/passenger');
  };

  return (
    <Page background={COLORS.white} padBottom={28}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: COLORS.navy,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🛺
          </div>
          <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 17 }}>Taxi-Moto</div>
        </div>
        <div
          style={{
            padding: '8px 14px',
            borderRadius: 99,
            backgroundColor: COLORS.grayLight,
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.navy,
          }}
        >
          Côte d’Ivoire 🇨🇮
        </div>
      </div>

      <div
        style={{
          margin: '4px 20px 20px',
          borderRadius: 28,
          padding: '26px 22px',
          background: `linear-gradient(150deg, ${COLORS.navy} 0%, ${COLORS.blue} 100%)`,
          color: COLORS.white,
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 10 }}>🛺 🏍️</div>
        <div style={{ fontSize: 23, fontWeight: 800, lineHeight: 1.25 }}>
          Votre déplacement, simplement.
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 14, opacity: 0.9, lineHeight: 1.5 }}>
          Trouvez rapidement une moto ou un tricycle près de vous.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '0 20px' }}>
        {(['tricycle', 'moto'] as VehicleType[]).map((key) => {
          const info = VEHICLES[key];
          const active = vehicle === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setVehicle(key)}
              style={{
                flex: 1,
                textAlign: 'left',
                padding: 16,
                borderRadius: 22,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: active ? `2px solid ${COLORS.orange}` : `1.5px solid ${COLORS.grayLight}`,
                backgroundColor: active ? '#FFF3E6' : COLORS.white,
                boxShadow: '0 8px 22px rgba(6,43,103,0.07)',
              }}
            >
              <div style={{ fontSize: 30 }}>{info.emoji}</div>
              <div style={{ fontWeight: 800, color: COLORS.navy, marginTop: 8 }}>
                {info.label.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                {info.description}
              </div>
            </button>
          );
        })}
      </div>
      {/* PART2 */}
      <div
        style={{
          margin: '18px 20px',
          padding: 18,
          borderRadius: 22,
          backgroundColor: COLORS.grayLight,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Navigation size={16} color={COLORS.blue} />
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.navy }}>
            Ma position actuelle
          </div>
        </div>
        <select
          value={destination}
          onChange={(event) => pickDestination(event.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '15px',
            borderRadius: 16,
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.navy,
            backgroundColor: COLORS.white,
            fontFamily: 'inherit',
          }}
        >
          <option value="">🏁 Où allez-vous ?</option>
          {DESTINATIONS.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name} · {item.distanceKm} km
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px 20px' }}>
        {ADVANTAGES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 12px',
                borderRadius: 99,
                backgroundColor: '#EAF2FF',
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.navy,
              }}
            >
              <Icon size={14} color={COLORS.green} />
              {item.label}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" type="button" onClick={start}>
          Commander une course
        </button>
        <button
          className="btn-primary"
          type="button"
          onClick={() => navigate('/register/driver')}
          style={{
            backgroundColor: COLORS.white,
            color: COLORS.navy,
            border: `1.5px solid ${COLORS.navy}`,
          }}
        >
          Devenir conducteur
        </button>
      </div>
    </Page>
  );
}
