import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, COMMISSION_RATE, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function DriverEarnings() {
  const { driverRidesToday, driverRevenue, driverCommission, driverNet } = useApp();

  return (
    <Page nav="driver" background={COLORS.grayLight}>
      <Header title="Mes revenus" subtitle="Aujourd’hui" variant="navy" />
      <div style={{ padding: 20 }}>
        <div
          style={{
            padding: 22,
            borderRadius: 26,
            background: `linear-gradient(150deg, ${COLORS.navy}, ${COLORS.blue})`,
            color: COLORS.white,
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.8 }}>REVENU NET À ENCAISSER</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>{fcfa(driverNet)}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
            {driverRidesToday.length} courses
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Revenus bruts</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.navy, marginTop: 4 }}>
              {fcfa(driverRevenue)}
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.gray }}>
              Commission {Math.round(COMMISSION_RATE * 100)} %
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.orange, marginTop: 4 }}>
              −{fcfa(driverCommission)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 13, fontWeight: 800, color: COLORS.navy }}>
          Détail des courses
        </div>

        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {driverRidesToday.map((ride) => (
            <div
              key={ride.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 14,
                borderRadius: 18,
                backgroundColor: COLORS.white,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.navy }}>
                  {ride.pickup} → {ride.destination}
                </div>
                <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                  {ride.time} · {ride.id}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.navy }}>
                  {fcfa(ride.price)}
                </div>
                <div style={{ fontSize: 11, color: COLORS.green }}>
                  +{fcfa(ride.price - ride.commission)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
