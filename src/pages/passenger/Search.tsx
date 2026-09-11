import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function Searching() {
  const navigate = useNavigate();
  const { rideStatus, offers, vehicle, passengers, destination, distanceKm, cancelRide } = useApp();
  const info = VEHICLES[vehicle ?? 'moto'];
  const estimate = estimateFare(distanceKm);

  useEffect(() => {
    if (rideStatus === 'offers') {
      navigate(offers.length > 0 ? '/passenger/offers' : '/passenger/unavailable');
    }
  }, [rideStatus, offers, navigate]);

  return (
    <Page background={COLORS.navy} scroll={false}>
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          color: COLORS.white,
          textAlign: 'center',
        }}
      >
        <div className="pulse-ring">
          <span />
          <span />
          <span />
          <strong>{info.emoji}</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 26 }}>
          Recherche d’un conducteur…
        </div>
        <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginTop: 8 }}>
          {info.label} · 👥 {passengers} passager{passengers > 1 ? 's' : ''}
          <br />
          🏁 {destination}
          <br />
          Estimation habituelle : {fcfa(estimate.min)} – {fcfa(estimate.max)}
        </p>
        <button
          type="button"
          onClick={() => {
            cancelRide();
            navigate('/passenger');
          }}
          style={{
            marginTop: 30,
            background: 'transparent',
            border: '1.5px solid rgba(255,255,255,0.5)',
            color: COLORS.white,
            padding: '14px 26px',
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Annuler la recherche
        </button>
      </div>
    </Page>
  );
}
