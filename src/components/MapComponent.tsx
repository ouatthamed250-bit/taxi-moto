import { useEffect } from 'react';
import type { FC } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Star } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { COLORS } from '../theme';

export interface MapMarker {
  id: string;
  position: [number, number];
  emoji: string;
  label: string;
  color?: string;
  /** Badge affiché sous le marqueur (ex. « Moto », « Tricycle »). */
  badge?: string;
  /** Note du conducteur — active le popup enrichi. */
  rating?: number;
  /** Distance depuis le passager (km) — affichée dans le popup enrichi. */
  distanceKm?: number;
}

interface MapProps {
  center: [number, number];
  zoom?: number;
  me?: boolean;
  meLabel?: string;
  markers?: MapMarker[];
  /** Marqueurs supplémentaires (ex. client + conducteur en temps réel). */
  otherMarkers?: MapMarker[];
  /** Rayon (en mètres) du cercle de zone autour du point « me ». 0 = masqué. */
  zoneRadius?: number;
  /** Tracé d'itinéraire : point de départ (ex. position du chauffeur). */
  routeFrom?: [number, number] | null;
  /** Tracé d'itinéraire : point d'arrivée (ex. position du client). */
  routeTo?: [number, number] | null;
}

const meIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${COLORS.blue};border:3px solid #fff;box-shadow:0 0 0 7px rgba(11,95,255,0.22)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function vehicleIcon(emoji: string, color: string, badge?: string): L.DivIcon {
  const badgeHtml = badge
    ? `<span style="margin-top:3px;padding:2px 8px;border-radius:99px;background:${COLORS.navy};color:#fff;font-size:9px;font-weight:800;letter-spacing:0.3px;white-space:nowrap;box-shadow:0 3px 8px rgba(6,43,103,0.35)">${badge}</span>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="width:38px;height:38px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:17px;border:2px solid #fff;box-shadow:0 6px 16px rgba(6,43,103,0.35)">${emoji}</div>${badgeHtml}</div>`,
    iconSize: [72, badge ? 60 : 38],
    iconAnchor: [36, 19],
  });
}

const Recenter: FC<{ lat: number; lng: number; zoom: number }> = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
};

/** Ajuste la vue pour englober plusieurs points (auto-zoom). */
const FitBounds: FC<{ pointsKey: string }> = ({ pointsKey }) => {
  const map = useMap();

  useEffect(() => {
    const points = pointsKey
      .split('|')
      .map((pair) => pair.split(',').map(Number) as [number, number]);

    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [pointsKey, map]);

  return null;
};

export const MapComponent: FC<MapProps> = ({
  center,
  zoom = 13,
  me = true,
  meLabel = 'Vous êtes ici',
  markers = [],
  otherMarkers = [],
  zoneRadius = 2000,
  routeFrom = null,
  routeTo = null,
}) => {
  const allMarkers = [...markers, ...otherMarkers];
  const points: [number, number][] = [
    ...(me ? [center] : []),
    ...allMarkers.map((marker) => marker.position),
  ];
  const pointsKey = points.map((point) => point.join(',')).join('|');

  return (
  <MapContainer
    center={center}
    zoom={zoom}
    style={{ height: '100%', width: '100%' }}
    scrollWheelZoom={false}
    zoomControl={false}
  >
    <TileLayer
      attribution="&copy; OpenStreetMap"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {points.length >= 2 ? (
      <FitBounds pointsKey={pointsKey} />
    ) : (
      <Recenter lat={center[0]} lng={center[1]} zoom={zoom} />
    )}

    {/* Cercle de zone de couverture autour de la position « me ». */}
    {me && zoneRadius > 0 && (
      <Circle
        center={center}
        radius={zoneRadius}
        pathOptions={{
          color: COLORS.orange,
          weight: 1.5,
          opacity: 0.75,
          dashArray: '6 8',
          fillColor: COLORS.orange,
          fillOpacity: 0.07,
        }}
      />
    )}

    {me && (
      <Marker position={center} icon={meIcon}>
        <Popup>{meLabel}</Popup>
      </Marker>
    )}

    {/* Itinéraire temps réel (chauffeur → client) : recalculé à chaque position. */}
    {routeFrom && routeTo && (
      <Polyline
        positions={[routeFrom, routeTo]}
        pathOptions={{
          color: COLORS.blue,
          weight: 4,
          opacity: 0.8,
          dashArray: '1 9',
          lineCap: 'round',
        }}
      />
    )}

    {allMarkers.map((marker) => {
      const enriched = marker.rating !== undefined || marker.distanceKm !== undefined;
      const rounded = Math.round(marker.rating ?? 0);

      return (
        <Marker
          key={marker.id}
          position={marker.position}
          icon={vehicleIcon(marker.emoji, marker.color ?? COLORS.orange, marker.badge)}
        >
          <Popup>
            {enriched ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 132 }}>
                <strong style={{ fontSize: 13, fontWeight: 800, color: COLORS.navy }}>
                  {marker.label}
                </strong>

                <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f5a623' }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} size={11} fill={value <= rounded ? 'currentColor' : 'none'} />
                  ))}
                  <strong style={{ marginLeft: 4, color: COLORS.navy, fontSize: 11 }}>
                    {marker.rating ?? '—'}
                  </strong>
                </span>

                {marker.distanceKm !== undefined && (
                  <span style={{ fontSize: 11, color: COLORS.gray }}>
                    À {marker.distanceKm} km
                  </span>
                )}
              </div>
            ) : (
              marker.label
            )}
          </Popup>
        </Marker>
      );
    })}
  </MapContainer>
  );
};
