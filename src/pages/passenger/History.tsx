import { Page } from '../../components/Page';
import { Header } from '../../components/Header';
import { COLORS, VEHICLES, fcfa } from '../../theme';
import { useApp } from '../../store/useApp';

const STATUS_TEXT: Record<string, { label: string; color: string }> = {
  completed: { label: 'Terminée', color: COLORS.green },
  cancelled: { label: 'Annulée', color: COLORS.red },
};

export default function PassengerHistory() {
  const { passengerHistory } = useApp();

  return (
    <Page nav="passenger" background={COLORS.white}>
      <Header title="Historique" subtitle={`${passengerHistory.length} courses enregistrées`} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {passengerHistory.map((ride) => {
          const status = STATUS_TEXT[ride.status] ?? { label: 'En cours', color: COLORS.blue };
          return (
            <div
              key={ride.id}
              style={{
                padding: 16,
                borderRadius: 20,
                backgroundColor: COLORS.grayLight,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>{VEHICLES[ride.vehicle].emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 14 }}>
                    {ride.pickup} → {ride.destination}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 3 }}>
                    {ride.date} · {ride.time} · {ride.distanceKm} km · {ride.driverName}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 14 }}>
                    {fcfa(ride.price)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: status.color }}>
                    {status.label}
                  </div>
                </div>
              </div>
              {(ride.rating || ride.commission > 0) && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 10,
                    fontSize: 12,
                    color: COLORS.gray,
                  }}
                >
                  <span>{ride.rating ? '⭐'.repeat(ride.rating) : 'Pas encore noté'}</span>
                  <span>Commission Taxi-Moto : {fcfa(ride.commission)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
