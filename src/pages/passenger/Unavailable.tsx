import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page';
import { COLORS, estimateFare, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function Unavailable() {
  const navigate = useNavigate();
  const { destination, distanceKm } = useApp();
  const [notified, setNotified] = useState(false);
  const estimate = estimateFare(distanceKm);

  return (
    <Page background={COLORS.white}>
      <div
        style={{
          minHeight: '100%',
          padding: '54px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🛺</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, lineHeight: 1.35 }}>
          Aucun conducteur disponible dans cette zone pour le moment.
        </div>
        <p style={{ color: COLORS.gray, fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
          {destination ? `Zone : ${destination}. ` : ''}
          La disponibilité dépend des conducteurs réellement inscrits. Taxi-Moto couvre
          progressivement de nouvelles zones.
        </p>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 20,
            backgroundColor: COLORS.grayLight,
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 13,
            color: COLORS.navy,
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>💡 À savoir</div>
          <div>
            Prix habituellement observé en zone couverte : {fcfa(estimate.min)} –{' '}
            {fcfa(estimate.max)}
          </div>
          <div style={{ marginTop: 6, color: COLORS.gray }}>
            Essayez une destination proche d’Abidjan pour trouver un conducteur.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setNotified((value) => !value)}
          style={{
            marginTop: 22,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 16,
            borderRadius: 16,
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            border: `1.5px solid ${notified ? COLORS.green : COLORS.navy}`,
            backgroundColor: notified ? '#E9F7F1' : COLORS.white,
            color: notified ? COLORS.green : COLORS.navy,
          }}
        >
          <Bell size={18} color={notified ? COLORS.green : COLORS.navy} />
          {notified ? 'Alerte activée ✓' : 'M’avertir lorsque le service sera disponible'}
        </button>

        <button
          className="btn-primary"
          type="button"
          style={{ marginTop: 14 }}
          onClick={() => navigate('/passenger')}
        >
          Retour à la carte
        </button>
      </div>
    </Page>
  );
}
