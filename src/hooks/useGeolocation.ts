import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPosition, GeoPositionWithTime } from '../types';
import {
  MIN_MOVE_KM,
  checkPermission,
  clearWatch,
  describeGeoError,
  getCurrentPosition,
  hasMovedEnough,
  isGeolocationSupported,
  watchPosition,
} from '../services/geolocation';
import type { GeoPermission } from '../services/geolocation';

interface UseGeolocationOptions {
  /** Active le suivi continu (par défaut : true). */
  enabled?: boolean;
  /** Appelé à chaque position RETENUE (après filtrage). */
  onUpdate?: (position: GeoPositionWithTime) => void;
  /** Déplacement minimal pour publier (km) — 10 m par défaut. */
  minDistanceKm?: number;
  /** Délai minimal entre deux publications (ms) — 2 s par défaut. */
  minIntervalMs?: number;
}

interface UseGeolocationResult {
  position: GeoPositionWithTime | null;
  error: string;
  loading: boolean;
  permission: GeoPermission;
  supported: boolean;
  requestPermission: () => Promise<void>;
}

/**
 * Suivi GPS du navigateur (permission + watchPosition), sans dépendance externe.
 *
 * La position est FILTRÉE avant publication :
 *   • debounce `minIntervalMs` (2 s par défaut) ;
 *   • déplacement mini `minDistanceKm` (10 m par défaut) → fini les sauts du GPS.
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const {
    enabled = true,
    minDistanceKm = MIN_MOVE_KM,
    minIntervalMs = 2000,
  } = options;

  const onUpdateRef = useRef(options.onUpdate);
  const [position, setPosition] = useState<GeoPositionWithTime | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<GeoPermission>('prompt');
  const watchId = useRef<number | null>(null);
  /** Dernière position réellement publiée (avec son horodatage). */
  const lastPublished = useRef<{ position: GeoPosition; at: number } | null>(null);

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

  /**
   * Publie la position si elle est significative.
   * `force` : première position ou action explicite de l'utilisateur.
   */
  const applyFiltered = useCallback(
    (next: GeoPositionWithTime, force = false) => {
      const previous = lastPublished.current;
      const now = Date.now();

      if (!force && previous) {
        // 1) Debounce : pas plus d'une publication toutes les N ms.
        if (now - previous.at < minIntervalMs) return;
        // 2) Anti-jitter : il faut avoir bougé de plus de 10 m.
        if (!hasMovedEnough(previous.position, next, minDistanceKm)) return;
      }

      lastPublished.current = { position: next, at: now };
      apply(next);
    },
    [apply, minDistanceKm, minIntervalMs],
  );

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

  /* Suivi continu dès que la permission N'EST PAS refusée. */
  useEffect(() => {
    /*
     * ⚠️ On démarre aussi quand l'état est « prompt » : sur beaucoup de
     * navigateurs Android / WebView, `permissions.query('geolocation')` renvoie
     * « prompt » alors que la géolocalisation fonctionne — l'ancien code
     * n'ouvrait JAMAIS le watch dans ce cas (aucune position publiée).
     */
    if (!enabled || !supported || permission === 'denied') return undefined;

    watchId.current = watchPosition(
      (next) => {
        applyFiltered(next);
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
  }, [enabled, supported, permission, applyFiltered]);

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
      // Action explicite de l'utilisateur → on publie sans attendre.
      applyFiltered({ ...next, timestamp: Date.now() }, true);
      setPermission('granted');
    } catch (requestError) {
      setError(describeGeoError(requestError));
      setPermission(await checkPermission());
    } finally {
      setLoading(false);
    }
  }, [applyFiltered, supported]);

  return { position, error, loading, permission, supported, requestPermission };
}
