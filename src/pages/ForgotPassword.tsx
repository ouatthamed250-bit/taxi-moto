import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Page } from '../components/Page';
import { COLORS } from '../theme';
import {
  getSecurityQuestion,
  resetPassword,
  verifySecurityAnswer,
} from '../services/authService';
import './ForgotPassword.css';

type Step = 1 | 2 | 3;

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const askQuestion = async () => {
    setError('');

    const found = await getSecurityQuestion(phone);
    if (!found) {
      setError('Aucun compte trouvé avec ce numéro.');
      return;
    }

    setQuestion(found);
    setStep(2);
  };

  const verifyAnswer = async () => {
    setError('');

    if (answer.trim().length < 2) {
      setError('Réponse trop courte.');
      return;
    }
    if (!(await verifySecurityAnswer(phone, answer))) {
      setError('Réponse incorrecte. Réessayez.');
      return;
    }

    setStep(3);
  };

  const submitReset = async () => {
    setError('');

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const result = await resetPassword(phone, answer, newPassword);
    if (!result.success) {
      setError(result.error ?? 'Réinitialisation impossible.');
      return;
    }

    setDone(true);
    window.setTimeout(() => navigate('/login'), 1800);
  };

  return (
    <Page background={COLORS.white}>
      <div className="forgot-page">

        {/* Background decoration */}
        <div className="forgot-orb forgot-orb--orange" />
        <div className="forgot-orb forgot-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="forgot-topbar">
          <button
            type="button"
            className="forgot-back"
            aria-label="Retour"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="forgot-brand">
            <img className="forgot-logo" src="/images/logo.png" alt="Taxi-Moto" />
            <span className="forgot-brand-text">Taxi-Moto</span>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className="forgot-hero">
          <h1 className="forgot-title">Mot de passe oublié</h1>
          <p className="forgot-subtitle">
            {step === 1 && 'Entrez votre numéro pour retrouver votre compte.'}
            {step === 2 && 'Répondez à votre question de sécurité.'}
            {step === 3 && 'Choisissez un nouveau mot de passe.'}
          </p>
        </section>

        {/* ===== ÉTAPES ===== */}
        <div className="forgot-steps">
          {[1, 2, 3].map((index) => (
            <span
              key={index}
              className={`forgot-step${step >= index ? ' forgot-step--done' : ''}${
                step === index ? ' forgot-step--active' : ''
              }`}
            >
              {step > index ? <Check size={13} /> : index}
            </span>
          ))}
        </div>

        {/* ===== CARTE ===== */}
        <main className="forgot-card">

          {/* Étape 1 : téléphone */}
          {step === 1 && (
            <>
              <div className="forgot-field">
                <label htmlFor="forgot-phone">Numéro de téléphone</label>

                <div className="forgot-input-wrapper">
                  <span className="forgot-input-icon">
                    <Smartphone size={18} />
                  </span>

                  <span className="forgot-prefix">+225</span>

                  <input
                    id="forgot-phone"
                    className="forgot-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07 00 00 00 00"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') askQuestion();
                    }}
                  />
                </div>
              </div>

              {error && <p className="forgot-error">{error}</p>}

              <button
                type="button"
                className="forgot-submit"
                onClick={askQuestion}
                disabled={phone.replace(/\D/g, '').length < 8}
              >
                Continuer
                <ArrowRight size={18} />
              </button>
            </>
          )}

          {/* Étape 2 : question de sécurité */}
          {step === 2 && (
            <>
              <div className="forgot-question">
                <span className="forgot-question-icon">
                  <ShieldCheck size={18} />
                </span>
                <span>{question}</span>
              </div>

              <div className="forgot-field">
                <label htmlFor="forgot-answer">Votre réponse</label>

                <div className="forgot-input-wrapper">
                  <span className="forgot-input-icon">
                    <LockKeyhole size={18} />
                  </span>

                  <input
                    id="forgot-answer"
                    className="forgot-input"
                    type="text"
                    autoComplete="off"
                    placeholder="Votre réponse"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') verifyAnswer();
                    }}
                  />
                </div>
              </div>

              {error && <p className="forgot-error">{error}</p>}

              <button type="button" className="forgot-submit" onClick={verifyAnswer}>
                Vérifier
              </button>

              <button
                type="button"
                className="forgot-change"
                onClick={() => {
                  setStep(1);
                  setError('');
                  setAnswer('');
                }}
              >
                Modifier le numéro
              </button>
            </>
          )}

          {/* Étape 3 : nouveau mot de passe */}
          {step === 3 && (
            <>
              <div className="forgot-field">
                <label htmlFor="forgot-new">Nouveau mot de passe</label>

                <div className="forgot-input-wrapper">
                  <span className="forgot-input-icon">
                    <LockKeyhole size={18} />
                  </span>

                  <input
                    id="forgot-new"
                    className="forgot-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="6 caractères minimum"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />

                  <button
                    type="button"
                    className="forgot-eye"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="forgot-field">
                <label htmlFor="forgot-confirm-new">Confirmer le nouveau mot de passe</label>

                <div className="forgot-input-wrapper">
                  <span className="forgot-input-icon">
                    <LockKeyhole size={18} />
                  </span>

                  <input
                    id="forgot-confirm-new"
                    className="forgot-input"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitReset();
                    }}
                  />

                  <button
                    type="button"
                    className="forgot-eye"
                    aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowConfirm((value) => !value)}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="forgot-error">{error}</p>}

              <button type="button" className="forgot-submit" onClick={submitReset}>
                Réinitialiser
              </button>
            </>
          )}

        </main>

        <p className="forgot-back-login">
          <button type="button" onClick={() => navigate('/login')}>
            Retour à la connexion
          </button>
        </p>

        {done && (
          <div className="forgot-toast" role="status">
            <CircleCheck size={18} />
            Mot de passe réinitialisé ✅
          </div>
        )}
      </div>
    </Page>
  );
}
