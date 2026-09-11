import { useNavigate } from 'react-router-dom';
import { MapPinned } from 'lucide-react';
import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

const ACTIVE = ['searching', 'offers', 'driver_found', 'driver_arriving', 'driver_arrived', 'in_progress'];

export default function PassengerRide() {
  const navigate = useNavigate();
  const { rideStatus, selectedOffer, vehicle, passengers, destination, distanceKm } = useApp();

  const isActive = ACTIVE.includes(rideStatus);

  const follow = () => {
    if (rideStatus === 'searching') {
      navigate('/passenger/search');
      return;
    }
    if (rideStatus === 'offers') {
      navigate('/passenger/offers');
      return;
    }
    navigate('/passenger/tracking');
  };

  return (
    <Page nav="passenger" background={COLORS.white}>
      <Header title="Mes courses" subtitle="Suivi en temps réel" />
      <div style={{ padding: 20 }}>
        {isActive ? (
          <div
            style={{
              padding: 20,
              borderRadius: 24,
              backgroundColor: COLORS.navy,
              color: COLORS.white,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75 }}>EN COURS</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 6 }}>
              {VEHICLES[vehicle ?? 'moto'].emoji} {VEHICLES[vehicle ?? 'moto'].label} · 👥{' '}
              {passengers}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>
              🏁 {destination || '—'} · {distanceKm} km
            </div>
            {selectedOffer && (
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                🔒 {fcfa(selectedOffer.price)} · {selectedOffer.driver.name}
              </div>
            )}
            <button
              className="btn-primary"
              type="button"
              onClick={follow}
              style={{ marginTop: 18, backgroundColor: COLORS.orange }}
            >
              Suivre ma course
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 12px' }}>
            <MapPinned size={54} color={COLORS.gray} style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.navy }}>
              Aucune course en cours
            </div>
            <p style={{ color: COLORS.gray, fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              Commandez une moto ou un tricycle quand vous voulez.
            </p>
            <button
              className="btn-primary"
              type="button"
              style={{ marginTop: 22 }}
              onClick={() => navigate('/passenger')}
            >
              Commander une course
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}
