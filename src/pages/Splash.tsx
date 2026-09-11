import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import './Splash.css';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/welcome'), 1800);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-page">

      {/* Background decoration */}
      <span className="splash-orb splash-orb--blue" />
      <span className="splash-orb splash-orb--orange" />

      {/* ===== LOGO + MARQUE ===== */}
      <div className="splash-center">
        <div className="splash-logo-wrap">
          <span className="splash-logo-glow" />

          <div className="splash-logo">
            <div className="splash-logo-pin">
              <MapPin size={30} strokeWidth={2.8} />
            </div>
            <div className="splash-logo-wheel splash-logo-wheel--one" />
            <div className="splash-logo-wheel splash-logo-wheel--two" />
          </div>
        </div>

        <div className="splash-brand">
          <span className="splash-brand-name">Taxi</span>
          <span className="splash-brand-taxi">Moto</span>
        </div>

        <p className="splash-baseline">Le transport de proximité, simplement.</p>
      </div>

      {/* ===== CHARGEMENT ===== */}
      <div className="splash-footer">
        <span className="splash-spinner" />
        <span className="splash-country">🇨🇮 Côte d’Ivoire</span>
      </div>
    </div>
  );
}

