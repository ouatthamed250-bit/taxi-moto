import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function PassengerProfile() {
  const navigate = useNavigate();
  const { userName, phone, passengerHistory, logout } = useApp();

  const completed = passengerHistory.filter((ride) => ride.status === 'completed');
  const totalSpent = completed.reduce((sum, ride) => sum + ride.price, 0);

  return (
    <Page nav="passenger" background={COLORS.grayLight}>
      <Header title="Mon profil" variant="navy" />

      <div style={{ padding: 20 }}>
        <div
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 24,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: '50%',
              backgroundColor: COLORS.grayLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            🧍
          </div>
          <div>
            <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 17 }}>
              {userName || 'Passager'}
            </div>
            <div style={{ color: COLORS.gray, fontSize: 13 }}>{phone || '+225 —'}</div>
            <div
              style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.green,
              }}
            >
              <ShieldCheck size={13} color={COLORS.green} /> Compte vérifié
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <div
            style={{
              flex: 1,
              backgroundColor: COLORS.white,
              borderRadius: 20,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.navy }}>
              {completed.length}
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Courses</div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: COLORS.white,
              borderRadius: 20,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.navy }}>
              {fcfa(totalSpent)}
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Total dépensé</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            backgroundColor: COLORS.white,
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          {[
            { icon: '💳', label: 'Moyens de paiement' },
            { icon: '🛡️', label: 'Sécurité et confidentialité' },
            { icon: '❓', label: 'Aide et assistance' },
          ].map((item, index) => (
            <div
              key={item.label}
              style={{
                padding: '17px 18px',
                fontSize: 15,
                color: COLORS.navy,
                fontWeight: 600,
                borderTop: index === 0 ? 'none' : `1px solid ${COLORS.grayLight}`,
                cursor: 'pointer',
              }}
            >
              {item.icon} {item.label}
            </div>
          ))}
        </div>

        <button
          className="btn-primary"
          type="button"
          onClick={() => navigate('/register/driver')}
          style={{ marginTop: 18, backgroundColor: COLORS.blue }}
        >
          🛺 Devenir conducteur
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          style={{
            marginTop: 12,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 16,
            borderRadius: 16,
            border: 'none',
            backgroundColor: '#FDEBEC',
            color: COLORS.red,
            fontWeight: 700,
            fontSize: 15,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <LogOut size={17} color={COLORS.red} /> Se déconnecter
        </button>
      </div>
    </Page>
  );
}
