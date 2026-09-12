import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useApp } from '../../store/useApp';
import {
  ADMIN_CODE_LENGTH,
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminCode,
} from '../../services/adminAuth';
import './AdminGate.css';

const MAX_ATTEMPTS = 3;
const LOCK_SECONDS = 30;

export default function AdminGate() {
  const navigate = useNavigate();
  const { loginAsAdmin } = useApp();

  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // Décompte du blocage (setState asynchrone → pas de set dans le corps de l'effet).
  useEffect(() => {
    if (lockUntil <= 0) return;

    const id = window.setInterval(() => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setLockUntil(0);
      } else {
        setRemaining(left);
      }
    }, 500);

    return () => window.clearInterval(id);
  }, [lockUntil]);

  // Déjà authentifié pour cette session → on file vers l'espace admin.
  if (isAdminAuthenticated()) {
    return <Navigate to="/admin/overview" replace />;
  }

  const locked = remaining > 0;

  const submit = () => {
    if (locked) return;

    if (code.length !== ADMIN_CODE_LENGTH) {
      setError(`Entrez un code à ${ADMIN_CODE_LENGTH} chiffres.`);
      return;
    }

    if (verifyAdminCode(code)) {
      setAdminAuthenticated(true);
      loginAsAdmin();
      navigate('/admin/overview', { replace: true });
      return;
    }

    const next = attempts + 1;
    setCode('');

    if (next >= MAX_ATTEMPTS) {
      setAttempts(0);
      setLockUntil(Date.now() + LOCK_SECONDS * 1000);
      setRemaining(LOCK_SECONDS);
      setError(`Trop de tentatives. Réessayez dans ${LOCK_SECONDS} secondes.`);
      return;
    }

    setAttempts(next);
    setError('Code incorrect');
  };

  return (
    <div className="admin-gate">
      <button
        type="button"
        className="admin-gate-back"
        aria-label="Retour"
        onClick={() => navigate('/')}
      >
        <ArrowLeft size={20} />
      </button>

      <div className="admin-gate-card">
        <img className="admin-gate-logo" src="/images/logo.png" alt="Taxi-Moto" />

        <label className="admin-gate-label" htmlFor="admin-code">
          Code d'accès
        </label>

        <div className="admin-gate-field">
          <span className="admin-gate-field-icon">
            <LockKeyhole size={18} />
          </span>

          <input
            id="admin-code"
            className="admin-gate-input"
            type={showCode ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="off"
            maxLength={ADMIN_CODE_LENGTH}
            placeholder="••••••"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, ADMIN_CODE_LENGTH));
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />

          <button
            type="button"
            className="admin-gate-eye"
            aria-label={showCode ? 'Masquer le code' : 'Afficher le code'}
            onClick={() => setShowCode((value) => !value)}
          >
            {showCode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {locked ? (
          <p className="admin-gate-locked">
            Bloqué — réessayez dans <strong>{remaining}s</strong>
          </p>
        ) : (
          error && <p className="admin-gate-error">{error}</p>
        )}

        <button
          type="button"
          className="admin-gate-submit"
          onClick={submit}
          disabled={locked || code.length < ADMIN_CODE_LENGTH}
        >
          Valider
        </button>
      </div>
    </div>
  );
}
