import { useEffect, useState } from 'react';
import type { GeoPosition } from '../types';
import { MAX_ACCURACY_METERS } from '../services/geolocation';
import { subscribeToDriverPosition } from '../services/realtimeDb';

/**
 * Position live d'un conducteur (Firebase Realtime Database).
 *
 * Les positions trop imprécises (> 50 m) sont IGNORÉES : on conserve la
 * dernière position fiable au lieu de faire sauter le marqueur sur la carte.
 * Retourne `null` tant qu'aucune position fiable n'a été reçue.
 */
export function useDriverLivePosition(driverId: string | undefined): GeoPosition | null {
  const [position, setPosition] = useState<GeoPosition | null>(null);

  useEffect(() => {
    if (!driverId) return undefined;

    return subscribeToDriverPosition(driverId, (live) => {
      if (!live) return;

      if (typeof live.accuracy === 'number' && live.accuracy > MAX_ACCURACY_METERS) {
        return; // position trop imprécise : on garde la précédente
      }

      setPosition({
        latitude: live.latitude,
        longitude: live.longitude,
        accuracy: live.accuracy,
      });
    });
  }, [driverId]);

  return position;
}
