import { useEffect, useState } from 'react';
import { Page } from '../../components/Page';
import { MapComponent } from '../../components/MapComponent';
import {
  ABIDJAN_CENTER,
  COLORS,
  MIN_FARE,
  VEHICLES,
  commissionOf,
  fcfa,
  netEarnings,
} from '../../theme';
import { useApp } from '../../store/useApp';

export default function DriverDashboard() {
  const {
    userName,
    driverOnline,
    toggleOnline,
    incomingRequest,
    triggerIncoming,
    acceptIncoming,
    rejectIncoming,
    driverRidesToday,
    driverRevenue,
    driverCommission,
    driverNet,
  } = useApp();
  const [fare, setFare] = useState(1500);

  useEffect(() => {
    if (!driverOnline || incomingRequest) return;
    const timer = window.setTimeout(() => triggerIncoming(), 3000);
    return () => window.clearTimeout(timer);
  }, [driverOnline, incomingRequest, triggerIncoming]);

  const info = VEHICLES[incomingRequest?.vehicle ?? 'moto'];

  return (
    <Page nav="driver" scroll={false} background={COLORS.grayLight}>
      <div style={{ height: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <MapComponent center={ABIDJAN_CENTER} meLabel="Votre position" />
        </div>

        <button
          type="button"
          onClick={toggleOnline}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderRadius: 20,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            backgroundColor: driverOnline ? COLORS.green : COLORS.navy,
            color: COLORS.white,
            boxShadow: '0 10px 26px rgba(6,43,103,0.25)',
          }}
        >
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 12, opacity: 0.85 }}>
              Bonjour {userName || 'Conducteur'}
            </span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>
              {driverOnline ? '🟢 DISPONIBLE' : '⚪ HORS LIGNE'}
            </span>
          </span>
          <span
            style={{
              padding: '8px 14px',
              borderRadius: 99,
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {driverOnline ? 'Hors ligne' : 'En ligne'}
          </span>
        </button>

        <div
          style={{
            position: 'absolute',
            top: 104,
            left: 16,
            right: 16,
            backgroundColor: COLORS.white,
            borderRadius: 22,
            padding: 16,
            boxShadow: '0 10px 26px rgba(6,43,103,0.12)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.gray, letterSpacing: 0.5 }}>
            AUJOURD’HUI
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.navy }}>
                {driverRidesToday.length}
              </div>
              <div style={{ fontSize: 11, color: COLORS.gray }}>Courses</div>
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.navy }}>
                {fcfa(driverRevenue)}
              </div>
              <div style={{ fontSize: 11, color: COLORS.gray }}>Bruts</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.orange }}>
                {fcfa(driverNet)}
              </div>
              <div style={{ fontSize: 11, color: COLORS.gray }}>Net</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: COLORS.gray, textAlign: 'right' }}>
            Commission plateforme (7 %) : {fcfa(driverCommission)}
          </div>
        </div>
        {incomingRequest ? (
          <div
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 100,
              backgroundColor: COLORS.white,
              borderRadius: 24,
              padding: 18,
              boxShadow: '0 -12px 34px rgba(6,43,103,0.22)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.orange }}>
                NOUVELLE DEMANDE
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>
                👥 {incomingRequest.passengers} passagers
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.navy, marginTop: 8 }}>
              {info.emoji} {info.label}
            </div>
            <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 8, lineHeight: 1.7 }}>
              📍 {incomingRequest.pickup}
              <br />
              🏁 {incomingRequest.destination}
              <br />
              📏 {incomingRequest.distanceKm} km
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.navy, marginTop: 14 }}>
              Proposez votre tarif
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setFare((value) => Math.max(MIN_FARE, value - 100))}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  border: 'none',
                  backgroundColor: COLORS.grayLight,
                  fontSize: 22,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: COLORS.navy,
                }}
              >
                −
              </button>
              <input
                type="number"
                value={fare}
                min={MIN_FARE}
                onChange={(event) => setFare(Number(event.target.value))}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 16,
                  border: `1.5px solid ${COLORS.grayLight}`,
                  backgroundColor: COLORS.grayLight,
                  fontSize: 20,
                  fontWeight: 800,
                  textAlign: 'center',
                  color: COLORS.navy,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setFare((value) => value + 100)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  border: 'none',
                  backgroundColor: COLORS.grayLight,
                  fontSize: 22,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: COLORS.navy,
                }}
              >
                +
              </button>
            </div>

            <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 10 }}>
              Minimum {fcfa(MIN_FARE)} · commission 7 % {fcfa(commissionOf(fare))} · vous recevez{' '}
              <strong style={{ color: COLORS.green }}>{fcfa(netEarnings(fare))}</strong>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                className="btn-primary"
                type="button"
                style={{ flex: 1, backgroundColor: COLORS.orange, padding: 14, fontSize: 15 }}
                onClick={() => {
                  acceptIncoming(Math.max(MIN_FARE, fare));
                  alert(`Course acceptée à ${fcfa(fare)} — prix verrouillé 🔒`);
                }}
              >
                Accepter la course
              </button>
              <button
                type="button"
                onClick={rejectIncoming}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 16,
                  border: 'none',
                  backgroundColor: COLORS.grayLight,
                  color: COLORS.red,
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Refuser
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 100,
              padding: 16,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.94)',
              textAlign: 'center',
              fontSize: 13,
              color: COLORS.gray,
            }}
          >
            {driverOnline
              ? '🟢 En attente de demandes…'
              : '⚪ Passez en ligne pour recevoir des courses.'}
          </div>
        )}

      </div>
    </Page>
  );
}
