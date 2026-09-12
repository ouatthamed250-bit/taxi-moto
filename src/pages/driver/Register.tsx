import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  Camera,
  Car,
  Check,
  Eye,
  EyeOff,
  Flag,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Smartphone,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Page } from '../../components/Page';
import { COLORS, VEHICLES } from '../../theme';
import { useApp } from '../../store/useApp';
import { SECURITY_QUESTIONS } from '../../services/authLocal';
import type { VehicleType } from '../../types';
import './Register.css';

const STEPS = ['Vos informations', 'Votre véhicule', 'Confirmation'];

/** Plaque d'immatriculation valide : AA-123-BC. */
const PLATE_RE = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;
/** Taille maximale d'une photo (Mo). */
const MAX_PHOTO_MB = 5;

export default function DriverRegister() {
  const navigate = useNavigate();
  const { registerDriver } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleType>('moto');
  const [plate, setPlate] = useState('');
  const [driverPhoto, setDriverPhoto] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  const info = VEHICLES[vehicle];

  const validateStep = (index: number) => {
    const next: Record<string, string> = {};

    if (index === 0) {
      if (name.trim().length < 3) {
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
      if (securityAnswer.trim().length < 2) {
        next.securityAnswer = 'Réponse trop courte (2 caractères minimum).';
      }
    }

    if (index === 1) {
      if (!PLATE_RE.test(plate.trim().toUpperCase())) {
        next.plate = 'Immatriculation invalide (ex. AA-123-BC).';
      }
      if (!driverPhoto) {
        next.driverPhoto = 'Ajoutez votre photo de conducteur.';
      }
      if (!vehiclePhoto) {
        next.vehiclePhoto = 'Ajoutez la photo de votre véhicule.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const previous = () => setStep((value) => Math.max(0, value - 1));

  const readPhoto = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
    errorKey: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, [errorKey]: 'Fichier image requis (JPG ou PNG).' }));
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: `Image trop lourde (maximum ${MAX_PHOTO_MB} Mo).`,
      }));
      return;
    }

    setErrors((prev) => {
      const cleaned = { ...prev };
      delete cleaned[errorKey];
      return cleaned;
    });

    const reader = new FileReader();
    reader.onload = () => setter(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const submit = () => {
    setSubmitError('');

    const result = registerDriver({
      name: name.trim(),
      phone,
      password,
      vehicle,
      plate: plate.trim().toUpperCase(),
      driverPhoto,
      vehiclePhoto,
      securityQuestion,
      securityAnswer,
    });

    if (!result.success) {
      setSubmitError(result.error ?? 'Inscription impossible.');
      return;
    }

    navigate('/driver');
  };

  return (
    <Page background={COLORS.white}>
      <div className="driver-register-page">

        {/* Background decoration */}
        <div className="driver-register-orb driver-register-orb--orange" />
        <div className="driver-register-orb driver-register-orb--blue" />

        {/* ===== HEADER ===== */}
        <header className="driver-register-topbar">
          <button
            type="button"
            className="driver-register-back"
            aria-label="Retour"
            onClick={() => navigate('/welcome')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="driver-register-brand">
            <div className="driver-register-logo" aria-hidden="true">
              <div className="driver-register-logo-pin">
                <Radar size={15} strokeWidth={2.6} />
              </div>
              <div className="driver-register-logo-wheel driver-register-logo-wheel--one" />
              <div className="driver-register-logo-wheel driver-register-logo-wheel--two" />
            </div>

            <div className="driver-register-brand-text">
              <span className="driver-register-eyebrow">Taxi Moto</span>
              <h1 className="driver-register-title">Devenir conducteur</h1>
            </div>
          </div>
        </header>

        {/* ===== PROGRESSION ===== */}
        <div className="driver-register-progress">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`driver-register-step ${
                index < step ? 'driver-register-step--done' : ''
              } ${index === step ? 'driver-register-step--active' : ''}`}
            >
              <span className="driver-register-step-dot">
                {index < step ? <Check size={13} /> : index + 1}
              </span>
              <span className="driver-register-step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* ===== EN-TÊTE D'ÉTAPE ===== */}
        <div className="driver-register-head">
          <span className="driver-register-head-step">Étape {step + 1}/3</span>
          <h2 className="driver-register-head-title">{STEPS[step]}</h2>
        </div>

        {/* ===== CONTENU ===== */}
        <main className="driver-register-card">
          {step === 0 && (
            <>
              {/* Nom complet */}
              <div className="driver-register-field">
                <label htmlFor="driver-name">Nom complet</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <UserRound size={18} />
                  </span>

                  <input
                    id="driver-name"
                    className="driver-register-input"
                    type="text"
                    autoComplete="name"
                    placeholder="Votre nom complet"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                {errors.name && (
                  <span className="driver-register-error">{errors.name}</span>
                )}
              </div>

              {/* Téléphone */}
              <div className="driver-register-field">
                <label htmlFor="driver-phone">Numéro de téléphone</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <Smartphone size={18} />
                  </span>

                  <span className="driver-register-prefix">+225</span>

                  <input
                    id="driver-phone"
                    className="driver-register-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07 00 00 00 00"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>

                {errors.phone && (
                  <span className="driver-register-error">{errors.phone}</span>
                )}
              </div>

              {/* Mot de passe */}
              <div className="driver-register-field">
                <label htmlFor="driver-password">Mot de passe</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <LockKeyhole size={18} />
                  </span>

                  <input
                    id="driver-password"
                    className="driver-register-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="6 caractères minimum"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />

                  <button
                    type="button"
                    className="driver-register-eye"
                    aria-label={
                      showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.password && (
                  <span className="driver-register-error">{errors.password}</span>
                )}
              </div>

              {/* Confirmation du mot de passe */}
              <div className="driver-register-field">
                <label htmlFor="driver-confirm">Confirmer le mot de passe</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <LockKeyhole size={18} />
                  </span>

                  <input
                    id="driver-confirm"
                    className="driver-register-input"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Répétez le mot de passe"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />

                  <button
                    type="button"
                    className="driver-register-eye"
                    aria-label={
                      showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                    onClick={() => setShowConfirm((value) => !value)}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.confirm && (
                  <span className="driver-register-error">{errors.confirm}</span>
                )}
              </div>

              {/* Question de sécurité */}
              <div className="driver-register-field">
                <label htmlFor="driver-question">Question de sécurité</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <ShieldCheck size={18} />
                  </span>

                  <select
                    id="driver-question"
                    className="driver-register-input driver-register-select"
                    value={securityQuestion}
                    onChange={(event) => setSecurityQuestion(event.target.value)}
                  >
                    {SECURITY_QUESTIONS.map((question) => (
                      <option key={question} value={question}>
                        {question}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Réponse de sécurité */}
              <div className="driver-register-field">
                <label htmlFor="driver-answer">Réponse</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <LockKeyhole size={18} />
                  </span>

                  <input
                    id="driver-answer"
                    className="driver-register-input"
                    type="text"
                    autoComplete="off"
                    placeholder="Votre réponse"
                    value={securityAnswer}
                    onChange={(event) => setSecurityAnswer(event.target.value)}
                  />
                </div>

                {errors.securityAnswer && (
                  <span className="driver-register-error">{errors.securityAnswer}</span>
                )}
              </div>
            </>
          )}


          {step === 1 && (
            <>
              {/* Type de véhicule */}
              <div className="driver-register-field">
                <label>Type de véhicule</label>

                <div className="driver-register-vehicles">
                  {(['moto', 'tricycle'] as VehicleType[]).map((key) => {
                    const Icon = key === 'moto' ? Bike : Car;
                    const active = vehicle === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        className={`driver-register-vehicle ${
                          active ? 'driver-register-vehicle--active' : ''
                        }`}
                        onClick={() => setVehicle(key)}
                      >
                        <span className="driver-register-vehicle-icon">
                          <Icon size={20} />
                        </span>
                        <strong>{VEHICLES[key].label}</strong>
                        <small>{VEHICLES[key].description}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plaque d'immatriculation */}
              <div className="driver-register-field">
                <label htmlFor="driver-plate">Plaque d’immatriculation</label>

                <div className="driver-register-input-wrapper">
                  <span className="driver-register-input-icon">
                    <Flag size={18} />
                  </span>

                  <input
                    id="driver-plate"
                    className="driver-register-input driver-register-input--plate"
                    type="text"
                    autoComplete="off"
                    maxLength={12}
                    placeholder="AA-123-BC"
                    value={plate}
                    onChange={(event) => setPlate(event.target.value.toUpperCase())}
                  />
                </div>

                {errors.plate && (
                  <span className="driver-register-error">{errors.plate}</span>
                )}
              </div>

              {/* Photo du conducteur */}
              <div className="driver-register-field">
                <label>Photo du conducteur</label>

                {driverPhoto ? (
                  <div className="driver-register-upload-preview">
                    <img
                      className="driver-register-upload-img"
                      src={driverPhoto}
                      alt="Photo du conducteur"
                    />

                    <label className="driver-register-upload-change">
                      <Camera size={15} />
                      Changer la photo
                      <input
                        className="driver-register-file"
                        type="file"
                        accept="image/*"
                        onChange={(event) => readPhoto(event, setDriverPhoto, 'driverPhoto')}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="driver-register-upload">
                    <span className="driver-register-upload-icon">
                      <Camera size={26} strokeWidth={1.9} />
                    </span>

                    <strong>Ajouter votre photo</strong>
                    <small>JPG ou PNG · selfie récent</small>

                    <input
                      className="driver-register-file"
                      type="file"
                      accept="image/*"
                      onChange={(event) => readPhoto(event, setDriverPhoto, 'driverPhoto')}
                    />
                  </label>
                )}

                {errors.driverPhoto && (
                  <span className="driver-register-error">{errors.driverPhoto}</span>
                )}
              </div>

              {/* Photo du véhicule */}
              <div className="driver-register-field">
                <label>Photo du {info.label.toLowerCase()}</label>

                {vehiclePhoto ? (
                  <div className="driver-register-upload-preview">
                    <img
                      className="driver-register-upload-img"
                      src={vehiclePhoto}
                      alt={`${info.label} du conducteur`}
                    />

                    <label className="driver-register-upload-change">
                      <Camera size={15} />
                      Changer la photo
                      <input
                        className="driver-register-file"
                        type="file"
                        accept="image/*"
                        onChange={(event) => readPhoto(event, setVehiclePhoto, 'vehiclePhoto')}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="driver-register-upload">
                    <span className="driver-register-upload-icon">
                      <Camera size={26} strokeWidth={1.9} />
                    </span>

                    <strong>Ajouter une photo</strong>
                    <small>
                      JPG ou PNG · photo de votre {info.label.toLowerCase()}
                    </small>

                    <input
                      className="driver-register-file"
                      type="file"
                      accept="image/*"
                      onChange={(event) => readPhoto(event, setVehiclePhoto, 'vehiclePhoto')}
                    />
                  </label>
                )}

                {errors.vehiclePhoto && (
                  <span className="driver-register-error">{errors.vehiclePhoto}</span>
                )}
              </div>
            </>
          )}


          {step === 2 && (
            <>
              <p className="driver-register-note">
                Vérifiez vos informations avant de créer votre compte.
              </p>

              <div className="driver-register-recap">
                <div className="driver-register-recap-row">
                  <span className="driver-register-recap-label">Nom complet</span>
                  <strong className="driver-register-recap-value">{name.trim() || '—'}</strong>
                </div>

                <div className="driver-register-recap-row">
                  <span className="driver-register-recap-label">Téléphone</span>
                  <strong className="driver-register-recap-value">{phone || '—'}</strong>
                </div>

                <div className="driver-register-recap-row">
                  <span className="driver-register-recap-label">Véhicule</span>
                  <strong className="driver-register-recap-value">
                    {info.emoji} {info.label}
                  </strong>
                </div>

                <div className="driver-register-recap-row">
                  <span className="driver-register-recap-label">Immatriculation</span>
                  <strong className="driver-register-recap-value">{plate || '—'}</strong>
                </div>

                <div className="driver-register-recap-row driver-register-recap-row--photo">
                  <span className="driver-register-recap-label">Photo du conducteur</span>

                  {driverPhoto ? (
                    <img
                      className="driver-register-recap-img"
                      src={driverPhoto}
                      alt="Photo du conducteur"
                    />
                  ) : (
                    <span className="driver-register-recap-empty">Aucune photo</span>
                  )}
                </div>

                <div className="driver-register-recap-row driver-register-recap-row--photo">
                  <span className="driver-register-recap-label">Photo du véhicule</span>

                  {vehiclePhoto ? (
                    <img
                      className="driver-register-recap-img"
                      src={vehiclePhoto}
                      alt={`${info.label} du conducteur`}
                    />
                  ) : (
                    <span className="driver-register-recap-empty">Aucune photo</span>
                  )}
                </div>
              </div>

              {submitError && (
                <p className="driver-register-error driver-register-error--global">{submitError}</p>
              )}
            </>
          )}

        </main>

        {/* ===== ACTIONS ===== */}
        <div className="driver-register-actions">
          {step > 0 && (
            <button type="button" className="driver-register-previous" onClick={previous}>
              Retour
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" className="driver-register-next" onClick={next}>
              Suivant
            </button>
          ) : (
            <button type="button" className="driver-register-submit" onClick={submit}>
              <UserPlus size={18} />
              Créer mon compte conducteur
            </button>
          )}
        </div>
      </div>
    </Page>
  );
}
