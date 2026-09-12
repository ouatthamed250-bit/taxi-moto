import { useEffect, useState } from 'react';
import type { GeoPosition } from '../types';
import { subscribeToDriverPosition } from '../services/realtimeDb';

/**
 * Position live d'un conducteur (Firebase Realtime Database).
 * Retourne `null` tant qu'aucune position n'a été publiée.
 */
export function useDriverLivePosition(driverId: string | undefined): GeoPosition | null {
  const [position, setPosition] = useState<GeoPosition | null>(null);

  useEffect(() => {
    if (!driverId) return undefined;

    return subscribeToDriverPosition(driverId, (live) => {
      setPosition(
        live ? { latitude: live.latitude, longitude: live.longitude } : null,
      );
    });
  }, [driverId]);

  return position;
}
