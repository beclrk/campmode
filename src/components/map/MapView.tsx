import { useEffect, useRef, useMemo, useState, useCallback, memo, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { Location } from '@/types';
import { getLocationTypeColor } from '@/lib/utils';
import type { Bounds } from '@/services/placesApi';

interface MapViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  center?: [number, number];
  userLocation?: [number, number] | null;
  routePositions?: [number, number][] | null;
  onBoundsChange?: (bounds: Bounds) => void;
  onZoomChange?: (zoom: number) => void;
}

interface ClusterPoint {
  type: 'Feature';
  id?: number;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { location?: Location; cluster?: boolean; point_count?: number; cluster_id?: number };
}

const CLUSTER_RADIUS = 60;
const CLUSTER_MAX_ZOOM = 16;
const CLUSTER_MIN_ZOOM = 2;

function createMarkerIcon(type: string, isSelected: boolean) {
  const color = getLocationTypeColor(type);
  const size = isSelected ? 44 : 36;
  const innerSize = isSelected ? 20 : 16;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${isSelected ? color : 'rgba(10,10,10,0.9)'};
        border: 3px solid ${color};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.1);' : ''}
      ">${getMarkerSvg(type, isSelected ? 'white' : color, innerSize)}</div>
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

function getClusterIcon(count: number) {
  const size = count >= 50 ? 52 : count >= 11 ? 44 : 36;
  const bg = 'rgba(30,41,59,0.95)';
  const border = 'rgba(148,163,184,0.8)';
  return L.divIcon({
    className: 'cluster-marker',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${bg};
        border: 3px solid ${border};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        color: #e2e8f0;
        font-weight: 700;
        font-size: ${count >= 50 ? 14 : count >= 11 ? 12 : 11}px;
      ">${count}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createUserMarker() {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 20px; height: 20px;
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

function MapController({ center, selectedLocation }: { center?: [number, number]; selectedLocation: Location | null }) {
  const map = useMap();
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedLocation && selectedLocation.id !== prevSelectedRef.current) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 14, { duration: 0.8 });
      prevSelectedRef.current = selectedLocation.id;
    }
  }, [selectedLocation, map]);
  useEffect(() => {
    if (center) map.flyTo(center, 12, { duration: 0.8 });
  }, [center, map]);
  return null;
}

function BoundsReporter({ onBoundsChange, onZoomChange }: { onBoundsChange: (bounds: Bounds) => void; onZoomChange?: (zoom: number) => void }) {
  const map = useMap();
  const report = useCallback(() => {
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    onBoundsChange({ sw: [sw.lat, sw.lng], ne: [ne.lat, ne.lng] });
    onZoomChange?.(map.getZoom());
  }, [map, onBoundsChange, onZoomChange]);
  useEffect(() => {
    report();
    map.on('moveend', report);
    return () => {
      map.off('moveend', report);
    };
  }, [map, report]);
  return null;
}

const LocationMarker = memo(function LocationMarker({
  location,
  isSelected,
  onSelect,
}: {
  location: Location;
  isSelected: boolean;
  onSelect: (location: Location) => void;
}) {
  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={createMarkerIcon(location.type, isSelected)}
      eventHandlers={{ click: () => onSelect(location) }}
    />
  );
});

function ClusterLayer({
  locations,
  selectedLocation,
  onLocationSelect,
}: {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
}) {
  const map = useMap();
  const [clusters, setClusters] = useState<ClusterPoint[]>([]);

  const index = useMemo(() => {
    const supercluster = new Supercluster<{ location: Location }>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
      minZoom: CLUSTER_MIN_ZOOM,
    });
    const points = locations.map((loc) => ({
      type: 'Feature' as const,
      properties: { location: loc },
      geometry: { type: 'Point' as const, coordinates: [loc.lng, loc.lat] as [number, number] },
    }));
    supercluster.load(points);
    return supercluster;
  }, [locations]);

  /** Z-order: draw EV chargers first (behind), then rest_stop, then campsite (on top) so campsites/rest stops are visible over EV chargers at same location. */
  const markerOrder = (f: ClusterPoint): number => {
    if (f.properties.cluster) return 0;
    const type = f.properties.location?.type ?? '';
    if (type === 'ev_charger') return 1;
    if (type === 'rest_stop') return 2;
    return 3; // campsite on top
  };

  const updateClusters = useCallback(() => {
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const zoom = map.getZoom();
    const bbox: [number, number, number, number] = [sw.lng, sw.lat, ne.lng, ne.lat];
    const result = index.getClusters(bbox, zoom) as ClusterPoint[];
    result.sort((a, b) => markerOrder(a) - markerOrder(b));
    setClusters(result);
  }, [map, index]);

  useEffect(() => {
    updateClusters();
    map.on('moveend', updateClusters);
    map.on('zoomend', updateClusters);
    return () => {
      map.off('moveend', updateClusters);
      map.off('zoomend', updateClusters);
    };
  }, [map, updateClusters]);

  const MAX_CLUSTER_COUNT_BEFORE_EXPAND = 5;

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        if (props.cluster) {
          const count = props.point_count ?? 0;
          if (count <= MAX_CLUSTER_COUNT_BEFORE_EXPAND) {
            try {
              const leaves = index.getLeaves(feature.id as number, Infinity, 0) as ClusterPoint[];
              leaves.sort((a, b) => markerOrder(a) - markerOrder(b));
              return (
                <Fragment key={`cluster-leaves-${feature.id}`}>
                  {leaves.map((leaf) => {
                    const loc = leaf.properties.location;
                    if (!loc) return null;
                    return (
                      <LocationMarker
                        key={loc.id}
                        location={loc}
                        isSelected={selectedLocation?.id === loc.id}
                        onSelect={onLocationSelect}
                      />
                    );
                  })}
                </Fragment>
              );
            } catch {
              return (
                <Marker
                  key={`cluster-${feature.id}`}
                  position={[lat, lng]}
                  icon={getClusterIcon(count)}
                  eventHandlers={{
                    click: () => {
                      const expansionZoom = Math.min(index.getClusterExpansionZoom(feature.id as number), 18);
                      map.flyTo([lat, lng], expansionZoom, { duration: 0.3 });
                    },
                  }}
                />
              );
            }
          }
          return (
            <Marker
              key={`cluster-${feature.id}`}
              position={[lat, lng]}
              icon={getClusterIcon(count)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(index.getClusterExpansionZoom(feature.id as number), 18);
                  map.flyTo([lat, lng], expansionZoom, { duration: 0.3 });
                },
              }}
            />
          );
        }
        const loc = props.location;
        if (!loc) return null;
        return (
          <LocationMarker
            key={loc.id}
            location={loc}
            isSelected={selectedLocation?.id === loc.id}
            onSelect={onLocationSelect}
          />
        );
      })}
    </>
  );
}

export default function MapView({
  locations,
  selectedLocation,
  onLocationSelect,
  center,
  userLocation,
  routePositions = null,
  onBoundsChange,
  onZoomChange,
}: MapViewProps) {
  const defaultCenter: [number, number] = [54.5, -3.5];
  const defaultZoom = 6;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapController center={center} selectedLocation={selectedLocation} />
      {onBoundsChange && <BoundsReporter onBoundsChange={onBoundsChange} onZoomChange={onZoomChange} />}
      {routePositions && routePositions.length >= 2 && (
        <Polyline
          positions={routePositions}
          pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.9, dashArray: '8, 8' }}
        />
      )}
      <ClusterLayer
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationSelect={onLocationSelect}
      />
      {userLocation && <Marker position={userLocation} icon={createUserMarker()} />}
    </MapContainer>
  );
}
