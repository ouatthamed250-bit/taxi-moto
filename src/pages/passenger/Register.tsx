import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { Field } from '../../components/Field';
import { COLORS } from '../../theme';
import { useApp } from '../../store/useApp';

export default function PassengerRegister() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const submit = () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 8) return;
    login('passenger', name.trim(), phone);
    navigate('/passenger');
  };

  return (
    <Page background={COLORS.white} scroll={false}>
      <Header title="Inscription passager" onBack={() => navigate('/welcome')} />
      <div style={{ padding: 24 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            backgroundColor: COLORS.grayLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
            margin: '0 auto 20px',
          }}
        >
          🧍
        </div>

        <Field label="Nom complet" value={name} onChange={setName} placeholder="Aïcha Koné" />
        <Field
          label="Numéro de téléphone"
          value={phone}
          onChange={setPhone}
          placeholder="+225 07 00 00 00 00"
          inputMode="tel"
        />

        <button
          type="button"
          style={{
            width: '100%',
            padding: 16,
            borderRadius: 16,
            border: `1.5px dashed ${COLORS.gray}`,
            background: 'transparent',
            color: COLORS.gray,
            fontFamily: 'inherit',
            fontSize: 14,
            marginBottom: 22,
            cursor: 'pointer',
          }}
        >
          📷 Ajouter une photo (optionnel)
        </button>

        <button className="btn-primary" type="button" onClick={submit}>
          Créer mon compte
        </button>
        <p style={{ textAlign: 'center', color: COLORS.gray, fontSize: 12, marginTop: 14 }}>
          Accès immédiat à l’espace passager.
        </p>
      </div>
    </Page>
  );
}
