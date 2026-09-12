import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { Page } from '../components/Page';
import { COLORS } from '../theme';
import { useApp } from '../store/useApp';
import './Login.css';

type Mode = 'passenger' | 'driver';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [mode, setMode] = useState<Mode>('passenger');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = phone.replace(/\D/g, '').length >= 8 && password.length > 0;

  const submit = async () => {
    setError('');

    const result = await login(phone, password);
    if (!result.success || !result.user) {
      setError(result.error ?? 'Connexion impossible.');
      return;
    }

    navigate(result.user.role === 'driver' ? '/driver' : '/passenger');
  };

  const isPassenger = mode === 'passenger';

  return (
    <Page background={COLORS.white}>
      <div className="login-page">

        {/* Background decoration */}
        <div className="login-bg-orb login-bg-orb--orange" />
        <div className="login-bg-orb login-bg-orb--blue" />

        <div className="login-container">

          {/* Brand */}
          <header className="login-brand">
            <img className="login-logo-img" src="/images/logo.png" alt="Taxi-Moto" />
          </header>

          {/* Hero */}
          <section className="login-hero">
            <div className="login-welcome-badge">
              <span className="login-live-dot" />
              <span>🇨🇮 Côte d'Ivoire</span>
            </div>

            <h1>
              Bon retour
              <span> 👋</span>
            </h1>

            <p>
              Connectez-vous avec votre numéro
              et votre mot de passe.
            </p>
          </section>

          {/* Main card */}
          <main className="login-card">

            {/* Tabs rôle */}
            <div className="login-role-label">
              <span>Je me connecte comme</span>
            </div>

            <div className="login-role-switch">
              <button
                type="button"
                className={`login-role ${isPassenger ? 'login-role--active' : ''}`}
                onClick={() => setMode('passenger')}
              >
                <span className="login-role-icon">
                  <UserRound size={20} />
                </span>

                <span className="login-role-content">
                  <strong>Client</strong>
                  <small>Je veux me déplacer</small>
                </span>

                {isPassenger && (
                  <span className="login-role-check">
                    <ChevronRight size={17} />
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`login-role ${!isPassenger ? 'login-role--active' : ''}`}
                onClick={() => setMode('driver')}
              >
                <span className="login-role-icon login-role-icon--driver">
                  <Bike size={20} />
                </span>

                <span className="login-role-content">
                  <strong>Conducteur</strong>
                  <small>Je propose des courses</small>
                </span>

                {!isPassenger && (
                  <span className="login-role-check">
                    <ChevronRight size={17} />
                  </span>
                )}
              </button>
            </div>

            {/* Téléphone */}
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="login-phone">
                Numéro de téléphone
              </label>

              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <Smartphone size={18} />
                </span>

                <span className="login-country">+225</span>

                <input
                  id="login-phone"
                  className="login-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="07 00 00 00 00"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="login-password">
                Mot de passe
              </label>

              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <LockKeyhole size={18} />
                </span>

                <input
                  id="login-password"
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canSubmit) submit();
                  }}
                />

                <button
                  type="button"
                  className="login-eye"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            {/* Action */}
            <button
              className="login-primary-button"
              type="button"
              onClick={submit}
              disabled={!canSubmit}
            >
              <span>
                Se connecter
                <small>Accéder à mon espace</small>
              </span>

              <span className="login-button-arrow">
                <ArrowRight size={22} />
              </span>
            </button>

            <button
              type="button"
              className="login-forgot"
              onClick={() => navigate('/forgot-password')}
            >
              Mot de passe oublié ?
            </button>

            {/* Register */}
            <div className="login-register">
              <span>Pas encore de compte ?</span>

              <Link to="/welcome">
                Créer un compte
                <ArrowRight size={15} />
              </Link>
            </div>

          </main>

          {/* Trust indicators */}
          <section className="login-trust">
            <div className="login-trust-item">
              <div className="login-trust-icon">
                <ShieldCheck size={17} />
              </div>
              <div>
                <strong>Sécurisé</strong>
                <span>Conducteurs vérifiés</span>
              </div>
            </div>

            <div className="login-trust-item">
              <div className="login-trust-icon">
                <MapPin size={17} />
              </div>
              <div>
                <strong>Local</strong>
                <span>Partout en Côte d'Ivoire</span>
              </div>
            </div>
          </section>

          {/* Admin */}
          <footer className="login-footer">
            <div className="login-footer-brand">
              <span className="login-footer-dot" />
              Taxi-Moto
            </div>
          </footer>

        </div>
      </div>
    </Page>
  );
}
