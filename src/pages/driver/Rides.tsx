import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

export default function DriverRides() {
  const { driverRidesToday } = useApp();

  return (
    <Page nav="driver" background={COLORS.white}>
      <Header title="Mes courses" subtitle={`${driverRidesToday.length} courses aujourd’hui`} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {driverRidesToday.length === 0 && (
          <p style={{ textAlign: 'center', color: COLORS.gray, marginTop: 40 }}>
            Aucune course pour le moment.
          </p>
        )}

        {driverRidesToday.map((ride) => (
          <div key={ride.id} style={{ padding: 16, borderRadius: 20, backgroundColor: COLORS.grayLight }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>{VEHICLES[ride.vehicle].emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 14 }}>
                  {ride.pickup} → {ride.destination}
                </div>
                <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 3 }}>
                  {ride.time} · {ride.distanceKm} km · {ride.passengerName}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 14 }}>
                  {fcfa(ride.price)}
                </div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>
                  Net {fcfa(ride.price - ride.commission)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
