import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  startCoords: { lat: number; lng: number };
  endCoords: { lat: number; lng: number };
  routeCoords: [number, number][];
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

export function RouteMap({ startCoords, endCoords, routeCoords }: RouteMapProps) {
  const bounds: LatLngBoundsExpression = [
    [startCoords.lat, startCoords.lng],
    [endCoords.lat, endCoords.lng],
  ];

  return (
    <div className="rounded-lg overflow-hidden border h-64">
      <MapContainer
        center={[startCoords.lat, startCoords.lng]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        <FitBounds bounds={bounds} />
        <Polyline positions={routeCoords} color="#2563eb" weight={4} opacity={0.8} />
        <CircleMarker
          center={[startCoords.lat, startCoords.lng]}
          radius={9}
          fillColor="#16a34a"
          color="white"
          weight={2}
          fillOpacity={1}
        >
          <Popup>Start</Popup>
        </CircleMarker>
        <CircleMarker
          center={[endCoords.lat, endCoords.lng]}
          radius={9}
          fillColor="#dc2626"
          color="white"
          weight={2}
          fillOpacity={1}
        >
          <Popup>End</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
