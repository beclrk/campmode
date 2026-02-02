import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Location } from '@/types';
import { getLocationTypeColor } from '@/lib/utils';

interface MapViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  center?: [number, number];
  userLocation?: [number, number] | null;
  routeStops?: Location[];
}

// Custom marker icon creator
function createMarkerIcon(type: string, isSelected: boolean) {
  const color = getLocationTypeColor(type);
  const size = isSelected ? 44 : 36;
  const innerSize = isSelected ? 20 : 16;
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${isSelected ? color : 'rgba(10,10,10,0.9)'};
        border: 3px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.1);' : ''}
      ">
        ${getMarkerSvg(type, isSelected ? 'white' : color, innerSize)}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function getMarkerSvg(type: string, color: string, size: number) {
  const icons: Record<string, string> = {
    campsite: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18L12 4 3 20z"/><path d="M9.5 20v-6h5v6"/></svg>`,
    ev_charger: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    rest_stop: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  };
  return icons[type] || icons.campsite;
}

// User location marker
function createUserMarker() {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 2px #3b82f6, 0 4px 12px rgba(59,130,246,0.5);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Component to handle map movements
function MapController({ center, selectedLocation }: { 
  center?: [number, number]; 
  selectedLocation: Location | null;
}) {
  const map = useMap();
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedLocation && selectedLocation.id !== prevSelectedRef.current) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 14, {
        duration: 0.8,
      });
      prevSelectedRef.current = selectedLocation.id;
    }
  }, [selectedLocation, map]);

  useEffect(() => {
    if (center) {
      map.flyTo(center, 12, { duration: 0.8 });
    }
  }, [center, map]);

  return null;
}

export default function MapView({
  locations,
  selectedLocation,
  onLocationSelect,
  center,
  userLocation,
  routeStops = [],
}: MapViewProps) {
  // UK center
  const defaultCenter: [number, number] = [54.5, -3.5];
  const defaultZoom = 6;

  const routePositions: [number, number][] =
    routeStops.length >= 2
      ? routeStops.map((loc) => [loc.lat, loc.lng])
      : [];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      {/* Dark map tiles */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Map controller for animations */}
      <MapController center={center} selectedLocation={selectedLocation} />

      {/* Route line - connects stops in order */}
      {routePositions.length >= 2 && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#22c55e',
            weight: 4,
            opacity: 0.9,
            dashArray: '8, 8',
          }}
        />
      )}

      {/* Location markers */}
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.lat, location.lng]}
          icon={createMarkerIcon(location.type, selectedLocation?.id === location.id)}
          eventHandlers={{
            click: () => onLocationSelect(location),
          }}
        />
      ))}

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={createUserMarker()}
        />
      )}
    </MapContainer>
  );
}
