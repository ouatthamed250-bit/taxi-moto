import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, VEHICLES, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function Offers() {
  const navigate = useNavigate();
  const {
    offers,
    chooseOffer,
    passengers,
    vehicle,
    distanceKm,
    destination,
    cancelRide,
  } = useApp();

  const info = VEHICLES[vehicle ?? 'moto'];
  const estimate = estimateFare(distanceKm);

  const pick = (id: string) => {
    const found = offers.find((offer) => offer.id === id);
    if (!found) return;
    chooseOffer(found);
    navigate('/passenger/tracking');
  };

  return (
    <Page background={COLORS.grayLight}>
      <Header
        title="Propositions des conducteurs"
        subtitle={`${info.emoji} ${info.label} · 👥 ${passengers} passager${passengers > 1 ? 's' : ''} · ${distanceKm} km`}
        onBack={() => {
          cancelRide();
          navigate('/passenger');
        }}
      />

      <div style={{ padding: 20 }}>
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 18,
            backgroundColor: '#EAF2FF',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.blue }}>
              ESTIMATION Taxi-Moto
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.navy }}>
              {fcfa(estimate.min)} – {fcfa(estimate.max)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: COLORS.gray, textAlign: 'right' }}>
            Le chauffeur
            <br />
            propose son prix
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {offers.map((offer) => (
            <div
              key={offer.id}
              style={{
                backgroundColor: COLORS.white,
                borderRadius: 22,
                padding: 16,
                boxShadow: '0 10px 24px rgba(6,43,103,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: COLORS.grayLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  {VEHICLES[offer.driver.vehicle].emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 15 }}>
                    {offer.driver.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      color: COLORS.gray,
                      marginTop: 2,
                    }}
                  >
                    <Star size={12} color={COLORS.yellow} fill={COLORS.yellow} />
                    {offer.driver.rating} · {offer.driver.model} · {offer.driver.plate}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.orange }}>
                    {fcfa(offer.price)}
                  </div>
                </div>
              </div>
              <button
                className="btn-primary"
                type="button"
                onClick={() => pick(offer.id)}
                style={{ marginTop: 14, padding: 13, fontSize: 15 }}
              >
                Choisir ce chauffeur
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: COLORS.gray, marginTop: 16 }}>
          Destination : {destination}. Le prix accepté dans l’application est verrouillé.
        </p>
      </div>
    </Page>
  );
}
