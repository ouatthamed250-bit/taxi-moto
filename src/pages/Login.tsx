import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  ChevronRight,
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

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export default function Login() {
  const navigate = useNavigate();
  const { login, driverApproved } = useApp();

  const [mode, setMode] = useState<Mode>('passenger');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const sendCode = () => {
    if (phone.replace(/\D/g, '').length >= 8) {
      setStep('otp');
    }
  };

  const verify = () => {
    if (code.replace(/\D/g, '').length < 4) return;

    login(
      mode,
      mode === 'passenger' ? 'Aïcha K.' : 'Kouassi Yao',
      phone
    );

    if (mode === 'passenger') {
      navigate('/passenger');
    } else {
      navigate(driverApproved ? '/driver' : '/register/driver');
    }
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
            <div className="login-logo">
              <div className="login-logo-pin">
                <MapPin size={22} strokeWidth={2.8} />
              </div>
              <div className="login-logo-wheel login-logo-wheel--one" />
              <div className="login-logo-wheel login-logo-wheel--two" />
            </div>

            <div>
              <div className="login-brand-name">Taxi</div>
              <div className="login-brand-taxi">Moto</div>
            </div>
          </header>

          {/* Hero */}
          <section className="login-hero">
            <div className="login-welcome-badge">
              <span className="login-live-dot" />
              <span>🇨🇮 Côte d'Ivoire</span>
            </div>

            <h1>
              Bienvenue
              <span> 👋</span>
            </h1>

            <p>
              Déplacez-vous simplement avec une moto
              ou un tricycle près de vous.
            </p>
          </section>

          {/* Main card */}
          <main className="login-card">

            {/* Role selector */}
            <div className="login-role-label">
              <span>Vous êtes</span>
            </div>

            <div className="login-role-switch">

              <button
                type="button"
                className={`login-role ${
                  isPassenger ? 'login-role--active' : ''
                }`}
                onClick={() => setMode('passenger')}
              >
                <span className="login-role-icon">
                  <UserRound size={20} />
                </span>

                <span className="login-role-content">
                  <strong>Passager</strong>
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
                className={`login-role ${
                  !isPassenger ? 'login-role--active' : ''
                }`}
                onClick={() => setMode('driver')}
              >
                <span className="login-role-icon login-role-icon--driver">
                  <Bike size={21} />
                </span>

                <span className="login-role-content">
                  <strong>Conducteur</strong>
                  <small>Je veux effectuer des courses</small>
                </span>

                {!isPassenger && (
                  <span className="login-role-check">
                    <ChevronRight size={17} />
                  </span>
                )}
              </button>

            </div>

            {/* Phone */}
            <div className="login-field-group">
              <label htmlFor="phone">
                Numéro de téléphone
              </label>

              <div className="login-input-wrapper">
                <div className="login-input-icon">
                  <Smartphone size={20} />
                </div>

                <span className="login-country">
                  +225
                </span>

                <input
                  id="phone"
                  style={inputStyle}
                  className="login-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="07 00 00 00 00"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                />
              </div>

              <div className="login-input-hint">
                <ShieldCheck size={14} />
                Votre numéro reste sécurisé
              </div>
            </div>

            {/* OTP */}
            {step === 'otp' && (
              <div className="login-otp-section">

                <div className="login-otp-header">
                  <div className="login-otp-icon">
                    <LockKeyhole size={20} />
                  </div>

                  <div>
                    <strong>Code de vérification</strong>
                    <span>
                      Code envoyé au {phone}
                    </span>
                  </div>
                </div>

                <input
                  className="login-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value.replace(/\D/g, '')
                    )
                  }
                />

                <div className="login-demo-code">
                  <span>Mode démonstration</span>
                  <strong>4 chiffres suffisent</strong>
                </div>

              </div>
            )}

            {/* Primary action */}
            {step === 'phone' ? (
              <button
                className="login-primary-button"
                type="button"
                onClick={sendCode}
                disabled={
                  phone.replace(/\D/g, '').length < 8
                }
              >
                <span>
                  Recevoir le code
                  <small>Vérification sécurisée</small>
                </span>

                <span className="login-button-arrow">
                  <ArrowRight size={22} />
                </span>
              </button>
            ) : (
              <button
                className="login-primary-button"
                type="button"
                onClick={verify}
                disabled={
                  code.replace(/\D/g, '').length < 4
                }
              >
                <span>
                  Vérifier et continuer
                  <small>Accéder à mon espace</small>
                </span>

                <span className="login-button-arrow">
                  <ArrowRight size={22} />
                </span>
              </button>
            )}

            {/* Back / resend */}
            {step === 'otp' && (
              <button
                type="button"
                className="login-change-number"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
              >
                Modifier le numéro
              </button>
            )}

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
            <Link to="/admin">
              <LockKeyhole size={14} />
              Espace administrateur
            </Link>

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