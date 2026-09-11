import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldCheck, Star } from 'lucide-react';
import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function DriverProfile() {
  const navigate = useNavigate();
  const { userName, phone, driverApproved, driverRidesToday, driverNet, logout } = useApp();

  return (
    <Page nav="driver" background={COLORS.grayLight}>
      <Header title="Profil conducteur" variant="navy" />

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
            🛺
          </div>
          <div>
            <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 17 }}>
              {userName || 'Conducteur'}
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
              <ShieldCheck size={13} color={COLORS.green} />
              {driverApproved ? 'Compte validé' : 'Validation en attente'}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            backgroundColor: COLORS.white,
            borderRadius: 22,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.gray }}>VÉHICULE</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.navy, marginTop: 8 }}>
            🏍️ Moto · Yamaha Crux
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 4 }}>
            Immatriculation : AB-1234-CI
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 13,
              color: COLORS.gray,
              marginTop: 4,
            }}
          >
            <Star size={13} color={COLORS.yellow} fill={COLORS.yellow} /> 4,8 · 412 courses
            réalisées
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
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy }}>
              {driverRidesToday.length}
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Courses du jour</div>
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
            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.orange }}>
              {fcfa(driverNet)}
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Net du jour</div>
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
          {['Mes documents', 'Assurance', 'Centre d’aide', 'Paramètres'].map((item, index) => (
            <div
              key={item}
              style={{
                padding: '17px 18px',
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.navy,
                borderTop: index === 0 ? 'none' : `1px solid ${COLORS.grayLight}`,
                cursor: 'pointer',
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
          style={{
            marginTop: 18,
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
