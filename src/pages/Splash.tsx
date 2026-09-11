import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../theme';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/welcome'), 1800);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        height: '100%',
        background: `linear-gradient(160deg, ${COLORS.navy} 0%, ${COLORS.blue} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: COLORS.white,
      }}
    >
      <div
        style={{
          width: 112,
          height: 112,
          borderRadius: 32,
          backgroundColor: COLORS.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
        }}
      >
        🛺
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1.5 }}>Taxi-Moto</div>
      <div style={{ fontSize: 14, opacity: 0.9 }}>Le transport de proximité, simplement.</div>
      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.65 }}>🇨🇮 Côte d’Ivoire</div>
      <div
        style={{
          marginTop: 22,
          width: 46,
          height: 5,
          borderRadius: 99,
          backgroundColor: COLORS.orange,
        }}
      />
    </div>
  );
}
