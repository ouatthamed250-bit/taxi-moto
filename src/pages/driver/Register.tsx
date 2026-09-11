import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { Field } from '../../components/Field';
import { COLORS, VEHICLES } from '../../theme';
import { useApp } from '../../store/useApp';
import type { VehicleType } from '../../types';

const DOCUMENTS = ['Pièce d’identité', 'Permis de conduire', 'Carte grise', 'Assurance'];

const STEPS = ['Identité', 'Véhicule', 'Détails', 'Documents'];

export default function DriverRegister() {
  const navigate = useNavigate();
  const { login, approveDriver } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('moto');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [docs, setDocs] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const toggleDoc = (doc: string) => {
    setDocs((current) =>
      current.includes(doc) ? current.filter((item) => item !== doc) : [...current, doc],
    );
  };

  const canContinue =
    (step === 0 && name.trim().length > 2 && phone.replace(/\D/g, '').length >= 8) ||
    step === 1 ||
    (step === 2 && model.trim().length > 1 && plate.trim().length > 3) ||
    (step === 3 && docs.length === DOCUMENTS.length);

  const next = () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    login('driver', name.trim(), phone);
    setPending(true);
  };

  if (pending) {
    return (
      <Page background={COLORS.white}>
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 54, marginBottom: 14 }}>⏳</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: COLORS.navy }}>
            Votre compte est en attente de validation.
          </div>
          <p style={{ color: COLORS.gray, fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
            Nos équipes vérifient vos documents. Vous recevrez une notification dès que votre
            compte sera validé.
          </p>
          <div
            style={{
              marginTop: 26,
              padding: 16,
              borderRadius: 18,
              backgroundColor: COLORS.grayLight,
              textAlign: 'left',
              fontSize: 13,
              color: COLORS.navy,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Récapitulatif</div>
            <div>👤 {name || 'Conducteur'}</div>
            <div>
              {VEHICLES[vehicle].emoji} {VEHICLES[vehicle].label} · {model}
            </div>
            <div>🔖 {plate}</div>
          </div>
          <button
            className="btn-primary"
            type="button"
            style={{ marginTop: 26 }}
            onClick={() => {
              approveDriver();
              navigate('/driver');
            }}
          >
            Simuler la validation administrateur
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page background={COLORS.white}>
      <Header
        title="Devenir conducteur"
        subtitle={`Étape ${step + 1}/4 · ${STEPS[step]}`}
        onBack={() => navigate('/welcome')}
      />
      <div style={{ padding: '20px 24px 28px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((label, index) => (
            <div
              key={label}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 99,
                backgroundColor: index <= step ? COLORS.orange : COLORS.grayLight,
              }}
            />
          ))}
        </div>

        {step === 0 && (
          <>
            <Field label="Nom complet" value={name} onChange={setName} placeholder="Kouassi Yao" />
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
                cursor: 'pointer',
              }}
            >
              📷 Photo de profil
            </button>
          </>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['moto', 'tricycle'] as VehicleType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setVehicle(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 18,
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  border:
                    vehicle === key ? `2px solid ${COLORS.orange}` : `1.5px solid ${COLORS.grayLight}`,
                  backgroundColor: vehicle === key ? '#FFF3E6' : COLORS.white,
                }}
              >
                <span style={{ fontSize: 30 }}>{VEHICLES[key].emoji}</span>
                <span>
                  <span style={{ display: 'block', fontWeight: 800, color: COLORS.navy }}>
                    {VEHICLES[key].label}
                  </span>
                  <span style={{ fontSize: 12, color: COLORS.gray }}>
                    {VEHICLES[key].description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <>
            <Field
              label="Marque / modèle"
              value={model}
              onChange={setModel}
              placeholder="Yamaha Crux"
            />
            <Field
              label="Immatriculation / N° d’identification"
              value={plate}
              onChange={setPlate}
              placeholder="AB-1234-CI"
            />
          </>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DOCUMENTS.map((doc) => {
              const checked = docs.includes(doc);
              return (
                <button
                  key={doc}
                  type="button"
                  onClick={() => toggleDoc(doc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    borderRadius: 18,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.navy,
                    border: checked
                      ? `1.5px solid ${COLORS.green}`
                      : `1.5px solid ${COLORS.grayLight}`,
                    backgroundColor: checked ? '#E9F7F1' : COLORS.white,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{checked ? '✅' : '📄'}</span>
                  {doc}
                </button>
              );
            })}
          </div>
        )}

        <button
          className="btn-primary"
          type="button"
          onClick={next}
          disabled={!canContinue}
          style={{
            marginTop: 24,
            opacity: canContinue ? 1 : 0.45,
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
        >
          {step === 3 ? 'Envoyer mon dossier' : 'Continuer'}
        </button>
      </div>
    </Page>
  );
}
