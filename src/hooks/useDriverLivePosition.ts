import { useEffect, useState } from 'react';
import type { GeoPosition } from '../types';
import { MAX_ACCURACY_METERS, REJECT_ACCURACY_METERS } from '../services/geolocation';
import { subscribeToDriverPosition } from '../services/realtimeDb';

/** Position live d'un conducteur + qualité du signal (confiance). */
export interface DriverLivePositionState {
  position: GeoPosition;
  /** true = précision > 100 m : position utilisable mais approximative. */
  imprecise: boolean;
  receivedAt: number;
}

/**
 * Position live d'un conducteur (Firebase Realtime Database).
 *
 * ⚠️ Les positions sont désormais ACCEPTÉES MÊME SI la précision est moyenne
 * (> 50 m, très fréquent sur Android) : sinon le marqueur du chauffeur
 * n'apparaissait jamais côté client. Seules les mesures aberrantes
 * (> 500 m) sont rejetées, et l'imprécision est signalée à l'UI
 * (`imprecise`) au lieu de tout jeter.
 */
export function useDriverLivePosition(driverId: string | undefined): DriverLivePositionState | null {
  const [state, setState] = useState<DriverLivePositionState | null>(null);

  useEffect(() => {
    if (!driverId) {
      // Aucun conducteur : on vide l'état (différé, pas de setState synchrone).
      const reset = window.setTimeout(() => setState(null), 0);
      return () => window.clearTimeout(reset);
    }

    return subscribeToDriverPosition(driverId, (live) => {
      if (!live) return;

      const accuracy = typeof live.accuracy === 'number' ? live.accuracy : undefined;

      if (accuracy !== undefined && accuracy > REJECT_ACCURACY_METERS) {
        console.warn(`[GPS] position chauffeur ignorée (précision ${Math.round(accuracy)} m)`);
        return;
      }

      console.log(
        `[GPS] position chauffeur reçue: ${live.latitude.toFixed(5)}, ${live.longitude.toFixed(5)}` +
          (accuracy !== undefined ? ` (précision ${Math.round(accuracy)} m)` : ''),
      );

      setState({
        position: {
          latitude: live.latitude,
          longitude: live.longitude,
          accuracy,
        },
        imprecise: accuracy !== undefined && accuracy > MAX_ACCURACY_METERS,
        receivedAt: Date.now(),
      });
    });
  }, [driverId]);

  return state;
}
