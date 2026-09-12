import { useRef, useState } from 'react';
import { AlertTriangle, CircleCheck, MapPin, Save, Settings as SettingsIcon, Wallet } from 'lucide-react';
import { MIN_FARE, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';
import type { AppSettings } from '../../types';
import './Settings.css';

type BooleanSettingKey =
  | 'passengerRegistrationEnabled'
  | 'driverRegistrationEnabled'
  | 'orderingEnabled'
  | 'mobileMoneyEnabled'
  | 'pushNotificationsEnabled'
  | 'maintenanceMode';

const TOGGLES: { key: BooleanSettingKey; label: string; hint: string; emoji: string }[] = [
  {
    key: 'passengerRegistrationEnabled',
    label: 'Inscription passager',
    hint: 'Autoriser la création de comptes clients',
    emoji: '👤',
  },
  {
    key: 'driverRegistrationEnabled',
    label: 'Inscription conducteur',
    hint: 'Autoriser la création de comptes conducteurs',
    emoji: '🏍️',
  },
  {
    key: 'orderingEnabled',
    label: 'Service de commande',
    hint: 'Autoriser les nouvelles courses',
    emoji: '🚕',
  },
  {
    key: 'mobileMoneyEnabled',
    label: 'Paiement mobile money',
    hint: 'Recharges Orange / Wave / MTN',
    emoji: '💰',
  },
  {
    key: 'pushNotificationsEnabled',
    label: 'Notifications push',
    hint: 'Alertes en temps réel',
    emoji: '🔔',
  },
  {
    key: 'maintenanceMode',
    label: 'Mode maintenance',
    hint: "Bloquer temporairement l'application",
    emoji: '🛠️',
  },
];

const DEPOSIT_OPERATORS: { key: keyof AppSettings['depositNumbers']; label: string }[] = [
  { key: 'orange', label: 'Orange Money' },
  { key: 'wave', label: 'Wave' },
  { key: 'mtn', label: 'MTN Money' },
  { key: 'moov', label: 'Moov Money' },
];

export default function Settings() {
  const { appSettings, updateAppSettings, zoneRules, updateZoneRule } = useApp();

  const [draft, setDraft] = useState<AppSettings>(appSettings);
  const [percent, setPercent] = useState(String(Math.round(appSettings.commissionRate * 100)));

  const [zoneDrafts, setZoneDrafts] = useState<Record<string, string>>({});
  const [zoneErrors, setZoneErrors] = useState<Record<string, string>>({});

  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };

  const setFlag = (key: BooleanSettingKey, value: boolean) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setNumber = (key: 'minRecharge' | 'maxRecharge' | 'lowBalanceThreshold', value: string) =>
    setDraft((current) => ({ ...current, [key]: Number(value) || 0 }));

  const setDeposit = (key: keyof AppSettings['depositNumbers'], value: string) =>
    setDraft((current) => ({
      ...current,
      depositNumbers: { ...current.depositNumbers, [key]: value },
    }));

  const saveAll = () => {
    const commissionRate = Math.max(0, Number(percent) || 0) / 100;

    if (commissionRate !== appSettings.commissionRate) {
      const confirmed = window.confirm(
        `Confirmer le nouveau taux de commission : ${Math.round(commissionRate * 100)} % ?`,
      );
      if (!confirmed) return;
    }

    updateAppSettings({ ...draft, commissionRate });
    showToast('Paramètres enregistrés ✅');
  };

  const saveZone = (zone: string, current: number) => {
    const raw = zoneDrafts[zone] ?? String(current);
    const value = Number(raw);

    if (!Number.isFinite(value) || value < MIN_FARE) {
      setZoneErrors((prev) => ({ ...prev, [zone]: `Minimum ${fcfa(MIN_FARE)} requis.` }));
      return;
    }

    updateZoneRule(zone, { min: value });
    setZoneErrors((prev) => ({ ...prev, [zone]: '' }));
    setZoneDrafts((prev) => {
      const next = { ...prev };
      delete next[zone];
      return next;
    });
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Paramètres de l'application</h1>
          <p className="admin-page-subtitle">
            Activation des services et configuration de la plateforme.
          </p>
        </div>

        <button type="button" className="admin-settings-save" onClick={saveAll}>
          <Save size={16} />
          Enregistrer les paramètres
        </button>
      </div>

      {/* ===== TOGGLES ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <SettingsIcon size={16} />
          </span>
          <h2 className="admin-section-title">Services</h2>
        </div>

        <div className="admin-toggle-list">
          {TOGGLES.map((item) => {
            const active = draft[item.key];

            return (
              <button
                key={item.key}
                type="button"
                className={`admin-toggle-row${active ? ' admin-toggle-row--on' : ''}`}
                onClick={() => setFlag(item.key, !active)}
              >
                <span className="admin-toggle-emoji" aria-hidden="true">
                  {item.emoji}
                </span>

                <span className="admin-toggle-text">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>

                <span className="admin-switch" aria-hidden="true">
                  <span className="admin-switch-knob" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== COMMISSION ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Wallet size={16} />
          </span>
          <h2 className="admin-section-title">Commission plateforme</h2>
          <span className="admin-section-count">
            Actuel : {Math.round(appSettings.commissionRate * 100)} %
          </span>
        </div>

        <label className="admin-field">
          <span>Taux de commission (%)</span>
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
          />
          <small>Une confirmation est demandée à l'enregistrement si le taux change.</small>
        </label>
      </section>

      {/* ===== NUMÉROS DE DÉPÔT ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Wallet size={16} />
          </span>
          <h2 className="admin-section-title">Numéros de dépôt mobile money</h2>
        </div>

        <div className="admin-fields-grid">
          {DEPOSIT_OPERATORS.map((operator) => (
            <label key={operator.key} className="admin-field">
              <span>{operator.label}</span>
              <input
                type="tel"
                inputMode="tel"
                placeholder="Ex : 07 00 00 00 00"
                value={draft.depositNumbers[operator.key]}
                onChange={(event) => setDeposit(operator.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      {/* ===== LIMITES DE RECHARGE ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <Wallet size={16} />
          </span>
          <h2 className="admin-section-title">Limites de recharge & solde</h2>
        </div>

        <div className="admin-fields-grid">
          <label className="admin-field">
            <span>Montant minimum de recharge (FCFA)</span>
            <input
              type="number"
              min={0}
              value={draft.minRecharge}
              onChange={(event) => setNumber('minRecharge', event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>Montant maximum de recharge (FCFA)</span>
            <input
              type="number"
              min={0}
              value={draft.maxRecharge}
              onChange={(event) => setNumber('maxRecharge', event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span>Seuil de solde faible (FCFA)</span>
            <input
              type="number"
              min={0}
              value={draft.lowBalanceThreshold}
              onChange={(event) => setNumber('lowBalanceThreshold', event.target.value)}
            />
          </label>
        </div>
      </section>

      {/* ===== ZONES TARIFAIRES ===== */}
      <section className="admin-section">
        <div className="admin-section-head">
          <span className="admin-section-icon">
            <MapPin size={16} />
          </span>
          <h2 className="admin-section-title">Zones tarifaires</h2>
          <span className="admin-section-count">{zoneRules.length} zones</span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Tarif minimum</th>
                <th>Fourchette observée</th>
                <th>Courses</th>
                <th>Moyenne</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {zoneRules.map((rule) => (
                <tr key={rule.zone}>
                  <td>{rule.zone}</td>
                  <td>
                    <input
                      className="admin-zone-input"
                      type="number"
                      min={MIN_FARE}
                      value={zoneDrafts[rule.zone] ?? String(rule.min)}
                      onChange={(event) =>
                        setZoneDrafts((prev) => ({ ...prev, [rule.zone]: event.target.value }))
                      }
                    />
                    {zoneErrors[rule.zone] && (
                      <span className="admin-zone-error">
                        <AlertTriangle size={12} />
                        {zoneErrors[rule.zone]}
                      </span>
                    )}
                  </td>
                  <td>{rule.observed}</td>
                  <td>{rule.courses.toLocaleString('fr-FR')}</td>
                  <td>{fcfa(rule.average)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-zone-save"
                      onClick={() => saveZone(rule.zone, rule.min)}
                    >
                      Enregistrer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <button type="button" className="admin-settings-save admin-settings-save--full" onClick={saveAll}>
        <Save size={17} />
        Enregistrer les paramètres
      </button>

      {toast && (
        <div className="admin-toast">
          <CircleCheck size={16} />
          {toast}
        </div>
      )}
    </>
  );
}

