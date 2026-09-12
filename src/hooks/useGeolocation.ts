import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPositionWithTime } from '../types';
import {
  checkPermission,
  clearWatch,
  describeGeoError,
  getCurrentPosition,
  isGeolocationSupported,
  watchPosition,
} from '../services/geolocation';
import type { GeoPermission } from '../services/geolocation';

interface UseGeolocationOptions {
  /** Active le suivi continu (par défaut : true). */
  enabled?: boolean;
  /** Appelé à chaque nouvelle position (ex. pour l'écrire dans le store). */
  onUpdate?: (position: GeoPositionWithTime) => void;
}

interface UseGeolocationResult {
  position: GeoPositionWithTime | null;
  error: string;
  loading: boolean;
  permission: GeoPermission;
  supported: boolean;
  requestPermission: () => Promise<void>;
}

/** Suivi GPS du navigateur (permission + watchPosition), sans dépendance externe. */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const { enabled = true } = options;

  const onUpdateRef = useRef(options.onUpdate);
  const [position, setPosition] = useState<GeoPositionWithTime | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<GeoPermission>('prompt');
  const watchId = useRef<number | null>(null);

  const supported = isGeolocationSupported();

  /* Garde la dernière callback sans la mettre dans les dépendances du watch. */
  useEffect(() => {
    onUpdateRef.current = options.onUpdate;
  }, [options.onUpdate]);

  const apply = useCallback((next: GeoPositionWithTime) => {
    setPosition(next);
    setError('');
    onUpdateRef.current?.(next);
  }, []);

  /* État de la permission au montage. */
  useEffect(() => {
    let active = true;

    checkPermission().then((state) => {
      if (active) setPermission(state);
    });

    return () => {
      active = false;
    };
  }, []);

  /* Suivi continu dès que la permission est accordée. */
  useEffect(() => {
    if (!enabled || !supported || permission !== 'granted') return;

    watchId.current = watchPosition(
      (next) => {
        apply(next);
        setLoading(false);
      },
      (watchError) => {
        setError(describeGeoError(watchError));
        setLoading(false);
      },
    );

    return () => {
      clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [enabled, supported, permission, apply]);

  const requestPermission = useCallback(async () => {
    setError('');
    setLoading(true);

    if (!supported) {
      setError('Géolocalisation non supportée par ce navigateur.');
      setLoading(false);
      return;
    }

    try {
      const next = await getCurrentPosition();
      apply({ ...next, timestamp: Date.now() });
      setPermission('granted');
    } catch (requestError) {
      setError(describeGeoError(requestError));
      setPermission(await checkPermission());
    } finally {
      setLoading(false);
    }
  }, [apply, supported]);

  return { position, error, loading, permission, supported, requestPermission };
}
