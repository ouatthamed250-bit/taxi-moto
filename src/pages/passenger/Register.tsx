import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Camera,
  Eye,
  EyeOff,
  LockKeyhole,
  Radar,
  Smartphone,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS } from '../../theme';
import { useApp } from '../../store/useApp';
import './Register.css';

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

interface FieldErrors {
  name?: string;
  phone?: string;
  password?: string;
  confirm?: string;
}

export default function PassengerRegister() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const next: FieldErrors = {};

    if (!name.trim()) {
      next.name = 'Entrez votre nom complet.';
    }
    if (phone.replace(/\D/g, '').length < 8) {
      next.phone = 'Numéro invalide (8 chiffres minimum).';
    }
    if (password.length < 6) {
      next.password = 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    if (confirmPassword !== password) {
      next.confirm = 'Les mots de passe ne correspondent pas.';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    login('passenger', name.trim(), phone, password);
    navigate('/passenger');
  };

  return (
    <Page background={COLORS.white}>
      <div className="register-page">

        {/* Background decoration */}
        <div className="register-orb register-orb--orange" />
        <div className="register-orb register-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="register-topbar">
          <button
            type="button"
            className="register-back"
            aria-label="Retour"
            onClick={() => navigate('/welcome')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="register-brand">
            <div className="register-logo" aria-hidden="true">
              <div className="register-logo-pin">
                <Radar size={14} strokeWidth={2.6} />
              </div>
              <div className="register-logo-wheel register-logo-wheel--one" />
              <div className="register-logo-wheel register-logo-wheel--two" />
            </div>
            <span className="register-brand-text">Taxi Moto</span>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className="register-hero">
          <h1 className="register-title">Créer un compte</h1>
          <p className="register-subtitle">Inscrivez-vous en quelques secondes</p>
        </section>

        {/* ===== RÔLE ===== */}
        <div className="register-roles">
          <button type="button" className="register-role register-role--active">
            <span className="register-role-icon">
              <UserRound size={17} />
            </span>
            Passager
          </button>

          <button
            type="button"
            className="register-role"
            onClick={() => navigate('/register/driver')}
          >
            <span className="register-role-icon register-role-icon--driver">
              <Bike size={17} />
            </span>
            Conducteur
          </button>
        </div>

        {/* ===== FORMULAIRE (glass) ===== */}
        <main className="register-card">
          {/* Nom complet */}
          <div className="register-field">
            <label htmlFor="register-name">Nom complet</label>

            <div className="register-input-wrapper">
              <span className="register-input-icon">
                <UserRound size={18} />
              </span>

              <input
                id="register-name"
                style={inputStyle}
                className="register-input"
                type="text"
                autoComplete="name"
                placeholder="Aïcha Koné"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {errors.name && <span className="register-error">{errors.name}</span>}
          </div>

          {/* Téléphone */}
          <div className="register-field">
            <label htmlFor="register-phone">Numéro de téléphone</label>

            <div className="register-input-wrapper">
              <span className="register-input-icon">
                <Smartphone size={18} />
              </span>

              <span className="register-prefix">+225</span>

              <input
                id="register-phone"
                style={inputStyle}
                className="register-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07 00 00 00 00"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            {errors.phone && <span className="register-error">{errors.phone}</span>}
          </div>

          {/* Mot de passe */}
          <div className="register-field">
            <label htmlFor="register-password">Mot de passe</label>

            <div className="register-input-wrapper">
              <span className="register-input-icon">
                <LockKeyhole size={18} />
              </span>

              <input
                id="register-password"
                style={inputStyle}
                className="register-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="6 caractères minimum"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="register-eye"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.password && <span className="register-error">{errors.password}</span>}
          </div>

          {/* Confirmation du mot de passe */}
          <div className="register-field">
            <label htmlFor="register-confirm">Confirmer le mot de passe</label>

            <div className="register-input-wrapper">
              <span className="register-input-icon">
                <LockKeyhole size={18} />
              </span>

              <input
                id="register-confirm"
                style={inputStyle}
                className="register-input"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />

              <button
                type="button"
                className="register-eye"
                aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowConfirm((value) => !value)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.confirm && <span className="register-error">{errors.confirm}</span>}
          </div>

          {/* Photo (optionnel) */}
          <button type="button" className="register-photo">
            <Camera size={16} />
            Ajouter une photo (optionnel)
          </button>

        </main>

        {/* ===== ACTIONS ===== */}
        <button type="button" className="register-submit" onClick={submit}>
          <UserPlus size={18} />
          Créer mon compte
        </button>

        <p className="register-login">
          Déjà un compte ?
          <button type="button" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </p>
      </div>
    </Page>
  );
}
