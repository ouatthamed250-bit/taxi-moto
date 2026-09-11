import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../components/Page';
import { COLORS } from '../theme';
import { useApp } from '../store/useApp';

type Mode = 'passenger' | 'driver';

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '16px',
  fontSize: 17,
  borderRadius: 16,
  border: `1.5px solid ${COLORS.grayLight}`,
  backgroundColor: COLORS.grayLight,
  outline: 'none',
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
    if (phone.replace(/\D/g, '').length >= 8) setStep('otp');
  };

  const verify = () => {
    if (code.replace(/\D/g, '').length < 4) return;
    login(mode, mode === 'passenger' ? 'Aïcha K.' : 'Kouassi Yao', phone);
    if (mode === 'passenger') {
      navigate('/passenger');
    } else {
      navigate(driverApproved ? '/driver' : '/register/driver');
    }
  };

  return (
    <Page background={COLORS.white}>
      <div style={{ padding: '28px 24px 24px' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.navy }}>Bienvenue 👋</div>
        <p style={{ color: COLORS.gray, marginTop: 6, marginBottom: 22, fontSize: 14 }}>
          Connectez-vous pour commander ou effectuer une course.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            backgroundColor: COLORS.grayLight,
            padding: 6,
            borderRadius: 18,
            marginBottom: 24,
          }}
        >
          {(['passenger', 'driver'] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              style={{
                flex: 1,
                border: 'none',
                padding: '12px 8px',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                backgroundColor: mode === item ? COLORS.navy : 'transparent',
                color: mode === item ? COLORS.white : COLORS.navy,
              }}
            >
              {item === 'passenger' ? '🧍 Passager' : '🛺 Conducteur'}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.navy }}>Numéro de téléphone</label>
        <input
          style={{ ...inputStyle, margin: '8px 0 18px' }}
          inputMode="tel"
          placeholder="+225 07 00 00 00 00"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />

        {step === 'phone' ? (
          <button className="btn-primary" type="button" onClick={sendCode}>
            Recevoir le code
          </button>
        ) : (
          <>
            <label style={{ fontSize: 13, fontWeight: 700, color: COLORS.navy }}>
              Code de vérification (4 chiffres)
            </label>
            <input
              style={{ ...inputStyle, margin: '8px 0 18px', letterSpacing: 8, textAlign: 'center' }}
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
            <button className="btn-primary" type="button" onClick={verify}>
              Vérifier et continuer
            </button>
            <p style={{ textAlign: 'center', color: COLORS.gray, fontSize: 12, marginTop: 12 }}>
              Code démo : n’importe quels 4 chiffres.
            </p>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: COLORS.gray }}>
          Pas encore de compte ?{' '}
          <Link to="/welcome" style={{ color: COLORS.blue, fontWeight: 700 }}>
            Créer un compte
          </Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 26 }}>
          <Link to="/admin" style={{ color: COLORS.gray, fontSize: 13 }}>
            🔒 Espace administrateur
          </Link>
        </p>
      </div>
    </Page>
  );
}
