import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { MapComponent } from '../../components/MapComponent';
import type { MapMarker } from '../../components/MapComponent';
import { PassengerSelector } from '../../components/PassengerSelector';
import { ABIDJAN_CENTER, COLORS, VEHICLES, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import { DESTINATIONS, DRIVERS } from '../../data/mock';

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

  const markers: MapMarker[] = DRIVERS.filter((driver) => driver.online).map((driver, index) => ({
    id: driver.id,
    position: [
      ABIDJAN_CENTER[0] + (index - 1) * 0.009,
      ABIDJAN_CENTER[1] + (index - 1) * 0.011,
    ] as [number, number],
    emoji: VEHICLES[driver.vehicle].emoji,
    label: `${driver.name} · ${VEHICLES[driver.vehicle].label} · ⭐ ${driver.rating}`,
    color: driver.vehicle === 'moto' ? COLORS.orange : COLORS.green,
  }));

  const selected = DESTINATIONS.find((item) => item.name === destination);
  const estimate = distanceKm > 0 ? estimateFare(distanceKm) : null;
  const motoAllowed = passengers <= VEHICLES.moto.max;

  const pickDestination = (name: string) => {
    setDestination(name);
    const found = DESTINATIONS.find((item) => item.name === name);
    setDistanceKm(found ? found.distanceKm : 0);
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

  return (
    <Page nav="passenger" scroll={false} background={COLORS.grayLight}>
      <div style={{ height: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <MapComponent center={ABIDJAN_CENTER} markers={markers} />
        </div>

        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 99,
              backgroundColor: COLORS.white,
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.navy,
              boxShadow: '0 8px 20px rgba(6,43,103,0.15)',
            }}
          >
            👋 {userName || 'Passager'}
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 99,
              backgroundColor: COLORS.navy,
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.white,
              boxShadow: '0 8px 20px rgba(6,43,103,0.25)',
            }}
          >
            🇨🇮 Abidjan
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '64%',
            overflowY: 'auto',
            backgroundColor: COLORS.white,
            borderRadius: '28px 28px 0 0',
            padding: '22px 20px 122px',
            boxShadow: '0 -12px 34px rgba(6,43,103,0.18)',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 14 }}>
            Où allez-vous ?
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 16px',
              borderRadius: 18,
              backgroundColor: COLORS.grayLight,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 18 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray }}>
                POSITION ACTUELLE
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.navy }}>Ma position</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 16px',
              borderRadius: 18,
              backgroundColor: COLORS.grayLight,
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 18 }}>🏁</span>
            <select
              value={destination}
              onChange={(event) => pickDestination(event.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                padding: '14px 0',
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.navy,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              <option value="">Choisir une destination</option>
              {DESTINATIONS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} · {item.distanceKm} km
                </option>
              ))}
            </select>
          </div>

          <PassengerSelector count={passengers} setCount={setPassengers} />

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {(['moto', 'tricycle'] as const).map((key) => {
              const allowed = key === 'moto' ? motoAllowed : true;
              const active = vehicle === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!allowed}
                  onClick={() => setVehicle(key)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '14px 8px',
                    borderRadius: 20,
                    cursor: allowed ? 'pointer' : 'not-allowed',
                    opacity: allowed ? 1 : 0.4,
                    fontFamily: 'inherit',
                    border: active ? `2px solid ${COLORS.orange}` : `1.5px solid ${COLORS.grayLight}`,
                    backgroundColor: active ? '#FFF3E6' : COLORS.white,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{VEHICLES[key].emoji}</span>
                  <span style={{ fontWeight: 800, color: COLORS.navy, fontSize: 14 }}>
                    {VEHICLES[key].label}
                  </span>
                  <span style={{ fontSize: 11, color: COLORS.gray }}>
                    {allowed ? VEHICLES[key].description : 'Capacité insuffisante'}
                  </span>
                </button>
              );
            })}
          </div>

          {estimate && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 20,
                background: `linear-gradient(140deg, ${COLORS.navy}, ${COLORS.blue})`,
                color: COLORS.white,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Estimation Taxi-Moto</div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  {fcfa(estimate.min)} – {fcfa(estimate.max)}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  {distanceKm} km · le prix final est proposé par le chauffeur
                </div>
              </div>
              <div style={{ fontSize: 28 }}>🛺</div>
            </div>
          )}

          <button
            className="btn-primary"
            type="button"
            onClick={order}
            disabled={!destination || !vehicle}
            style={{ marginTop: 16, opacity: destination && vehicle ? 1 : 0.45 }}
          >
            Commander
          </button>
        </div>
      </div>
    </Page>
  );
}
