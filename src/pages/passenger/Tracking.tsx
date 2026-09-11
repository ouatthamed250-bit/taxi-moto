import { useEffect, useState } from 'react';
import { Phone, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { MapComponent } from '../../components/MapComponent';
import { ABIDJAN_CENTER, COLORS, VEHICLES, commissionOf, fcfa, netEarnings } from '../../theme';
import { useApp } from '../../store/useApp';

const STATUS_LABEL: Record<string, string> = {
  driver_found: 'Conducteur trouvé',
  driver_arriving: 'Conducteur en route',
  driver_arrived: 'Conducteur arrivé',
  in_progress: 'Course en cours',
};

export default function Tracking() {
  const navigate = useNavigate();
  const { selectedOffer, rideStatus, advanceRide, cancelRide, rateRide, resetBooking } = useApp();
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (!selectedOffer) navigate('/passenger');
  }, [selectedOffer, navigate]);

  if (!selectedOffer) return null;

  const driver = selectedOffer.driver;
  const info = VEHICLES[driver.vehicle];
  const driverPin: [number, number] = [ABIDJAN_CENTER[0] + 0.006, ABIDJAN_CENTER[1] + 0.007];
  const completed = rideStatus === 'completed';

  const finish = () => {
    if (rating > 0) rateRide(rating);
    resetBooking();
    navigate('/passenger/history');
  };

  return (
    <Page scroll={false} background={COLORS.grayLight}>
      <div style={{ height: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <MapComponent
            center={ABIDJAN_CENTER}
            markers={[
              {
                id: driver.id,
                position: driverPin,
                emoji: info.emoji,
                label: `${driver.name} · ${driver.plate}`,
                color: COLORS.orange,
              },
            ]}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.white,
            borderRadius: '28px 28px 0 0',
            padding: 22,
            boxShadow: '0 -12px 34px rgba(6,43,103,0.18)',
          }}
        >
          {completed ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy }}>
                Course terminée ✅
              </div>
              <p style={{ color: COLORS.gray, fontSize: 14, marginTop: 6 }}>
                Notez {driver.name} pour améliorer la communauté Taxi-Moto.
              </p>
              <div style={{ display: 'flex', gap: 8, margin: '14px 0 18px' }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} étoiles`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <Star
                      size={32}
                      color={COLORS.yellow}
                      fill={value <= rating ? COLORS.yellow : 'none'}
                    />
                  </button>
                ))}
              </div>
              <button className="btn-primary" type="button" onClick={finish}>
                Terminer
              </button>
            </>
          ) : (
            <>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.navy }}>
                  {STATUS_LABEL[rideStatus] ?? 'Course'}
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 99,
                    backgroundColor: '#FFF3E6',
                    color: COLORS.orange,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  🔒 {fcfa(selectedOffer.price)}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 20,
                  backgroundColor: COLORS.grayLight,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    backgroundColor: COLORS.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {info.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: COLORS.navy }}>{driver.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 3 }}>
                    ⭐ {driver.rating} · {driver.model} · {driver.plate}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.gray }}>
                    Conducteur {fcfa(netEarnings(selectedOffer.price))} · commission 7 %{' '}
                    {fcfa(commissionOf(selectedOffer.price))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => alert(`Appel de ${driver.name}…`)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 15,
                    borderRadius: 16,
                    border: 'none',
                    backgroundColor: COLORS.green,
                    color: COLORS.white,
                    fontWeight: 700,
                    fontSize: 15,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <Phone size={17} color={COLORS.white} /> Appeler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelRide();
                    navigate('/passenger');
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 15,
                    borderRadius: 16,
                    border: 'none',
                    backgroundColor: COLORS.grayLight,
                    color: COLORS.red,
                    fontWeight: 700,
                    fontSize: 15,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <X size={17} color={COLORS.red} /> Annuler
                </button>
              </div>

              <button
                className="btn-primary"
                type="button"
                onClick={advanceRide}
                style={{ marginTop: 12 }}
              >
                Étape suivante (simulation)
              </button>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
