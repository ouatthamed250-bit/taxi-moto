import { useEffect } from 'react';
import type { FC } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLORS } from '../theme';

export interface MapMarker {
  id: string;
  position: [number, number];
  emoji: string;
  label: string;
  color?: string;
}

interface MapProps {
  center: [number, number];
  zoom?: number;
  me?: boolean;
  meLabel?: string;
  markers?: MapMarker[];
}

const meIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${COLORS.blue};border:3px solid #fff;box-shadow:0 0 0 7px rgba(11,95,255,0.22)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function vehicleIcon(emoji: string, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:38px;height:38px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:17px;border:2px solid #fff;box-shadow:0 6px 16px rgba(6,43,103,0.35)">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

const Recenter: FC<{ lat: number; lng: number; zoom: number }> = ({ lat, lng, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
};

export const MapComponent: FC<MapProps> = ({
  center,
  zoom = 13,
  me = true,
  meLabel = 'Vous êtes ici',
  markers = [],
}) => (
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
    <Recenter lat={center[0]} lng={center[1]} zoom={zoom} />
    {me && (
      <Marker position={center} icon={meIcon}>
        <Popup>{meLabel}</Popup>
      </Marker>
    )}
    {markers.map((marker) => (
      <Marker
        key={marker.id}
        position={marker.position}
        icon={vehicleIcon(marker.emoji, marker.color ?? COLORS.orange)}
      >
        <Popup>{marker.label}</Popup>
      </Marker>
    ))}
  </MapContainer>
);
