import React, { useEffect, useMemo, useState, useCallback, memo, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { Location } from '@/types';
import { getLocationTypeColor } from '@/lib/utils';
import type { Bounds } from '@/services/placesApi';

export type BasemapId = 'default' | 'os-road' | 'os-outdoor' | 'os-light';

interface MapViewProps {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  center?: [number, number];
  userLocation?: [number, number] | null;
  routePositions?: [number, number][] | null;
  onBoundsChange?: (bounds: Bounds) => void;
  onZoomChange?: (zoom: number) => void;
  /** Current basemap; 'default' = Carto dark. OS options require osApiKey. */
  basemap?: BasemapId;
  onBasemapChange?: (basemap: BasemapId) => void;
  /** OS Maps API key (VITE_OS_API_KEY). When set, OS layer options are shown. */
  osApiKey?: string;
  /** Location ids in top 10% per category by quality — show gold star badge. */
  top10PercentIds?: Set<string>;
  /** Location ids with 5+ photos — show gold crown badge. */
  crownIds?: Set<string>;
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

// Gold star badge (top 10% by quality) — top-left
const STAR_BADGE_HTML = (iconSize: number) =>
  `<span style="position:absolute;top:-6px;left:-6px;width:${iconSize}px;height:${iconSize}px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #fef3c7;"><svg width="${iconSize - 4}" height="${iconSize - 4}" viewBox="0 0 24 24" fill="#fff" stroke="#f59e0b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>`;
// Gold crown badge (5+ photos) — top-right; Lucide Crown paths
const CROWN_BADGE_HTML = (iconSize: number) =>
  `<span style="position:absolute;top:-6px;right:-6px;width:${iconSize}px;height:${iconSize}px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #fef3c7;"><svg width="${iconSize - 4}" height="${iconSize - 4}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M4 16h16"/></svg></span>`;

function createMarkerIcon(type: string, isSelected: boolean, isTop10: boolean, isCrown: boolean) {
  const color = getLocationTypeColor(type);
  const size = isSelected ? 44 : 36;
  const innerSize = isSelected ? 20 : 16;
  const starBadge = isTop10 ? STAR_BADGE_HTML(18) : '';
  const crownBadge = isCrown ? CROWN_BADGE_HTML(18) : '';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;display:inline-block;">
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
        ${starBadge}
        ${crownBadge}
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

function MapController({ center }: { center?: [number, number]; selectedLocation: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 12, { duration: 0.8 });
  }, [center, map]);
  return null;
}

function MapZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-4 z-[1100] flex flex-col gap-1 rounded-xl overflow-hidden shadow-lg border border-neutral-700 bg-neutral-900/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
        aria-label="Zoom in"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-10 h-10 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
        aria-label="Zoom out"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

const OS_LAYERS: { id: BasemapId; layer: string; label: string }[] = [
  { id: 'os-road', layer: 'Road_3857', label: 'OS Road' },
  { id: 'os-outdoor', layer: 'Outdoor_3857', label: 'OS Outdoor' },
  { id: 'os-light', layer: 'Light_3857', label: 'OS Light' },
];

function MapLayerControl({
  basemap,
  onBasemapChange,
  osApiKey,
}: {
  basemap: BasemapId;
  onBasemapChange?: (basemap: BasemapId) => void;
  osApiKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const hasOs = Boolean(osApiKey?.trim());

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const options: { id: BasemapId; label: string }[] = [
    { id: 'default', label: 'Default' },
    ...(hasOs ? OS_LAYERS : []),
  ];

  return (
    <div ref={ref} className="absolute bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] left-4 md:bottom-4 z-[1100]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border border-neutral-700 bg-neutral-900/95 backdrop-blur-sm text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors text-sm font-medium"
        aria-label="Map layer"
        aria-expanded={open}
      >
        <span>{basemap === 'default' ? 'Default' : OS_LAYERS.find((l) => l.id === basemap)?.label ?? basemap}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={open ? 'rotate-180' : ''}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-40 py-1 rounded-xl shadow-lg border border-neutral-700 bg-neutral-900/95 backdrop-blur-sm overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onBasemapChange?.(opt.id);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                basemap === opt.id ? 'bg-green-500/20 text-green-400 font-medium' : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

/** Z-order: campsites on top, then rest stops, then EV chargers at the back. Higher zIndexOffset = in front. */
function getMarkerZIndexOffset(type: string): number {
  if (type === 'ev_charger') return -1000;
  if (type === 'rest_stop') return 0;
  return 1000; // campsite
}

const LocationMarker = memo(function LocationMarker({
  location,
  isSelected,
  onSelect,
  isTop10,
  isCrown,
}: {
  location: Location;
  isSelected: boolean;
  onSelect: (location: Location) => void;
  isTop10?: boolean;
  isCrown?: boolean;
}) {
  const isT = isTop10 ?? false;
  const isC = isCrown ?? false;
  return (
    <Marker
      key={`${location.id}-star-${isT}-crown-${isC}`}
      position={[location.lat, location.lng]}
      icon={createMarkerIcon(location.type ?? '', isSelected, isT, isC)}
      zIndexOffset={getMarkerZIndexOffset(location.type ?? '')}
      eventHandlers={{ click: () => onSelect(location) }}
    />
  );
});

function ClusterLayer({
  locations,
  selectedLocation,
  onLocationSelect,
  top10PercentIds,
  crownIds,
}: {
  locations: Location[];
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  top10PercentIds?: Set<string>;
  crownIds?: Set<string>;
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

  /** Draw order (back to front): EV chargers, then rest stops, then campsites. Lower sort key = drawn first = behind. */
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
                        isTop10={top10PercentIds?.has(loc.id)}
                        isCrown={crownIds?.has(loc.id)}
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
            isTop10={top10PercentIds?.has(loc.id)}
            isCrown={crownIds?.has(loc.id)}
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
  basemap = 'default',
  onBasemapChange,
  osApiKey,
  top10PercentIds,
  crownIds,
}: MapViewProps) {
  const defaultCenter: [number, number] = [54.5, -3.5];
  const defaultZoom = 6;

  const osLayer = basemap.startsWith('os-') ? OS_LAYERS.find((l) => l.id === basemap)?.layer : null;
  const osUrl =
    osApiKey && osLayer
      ? `https://api.os.uk/maps/raster/v1/zxy/${osLayer}/{z}/{x}/{y}.png?key=${encodeURIComponent(osApiKey)}`
      : null;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
    >
      {osUrl ? (
        <TileLayer
          url={osUrl}
          attribution='&copy; <a href="https://www.ordnancesurvey.co.uk/">Ordnance Survey</a>'
        />
      ) : (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
      )}
      <MapController center={center} selectedLocation={selectedLocation} />
      <MapZoomControls />
      <MapLayerControl basemap={basemap} onBasemapChange={onBasemapChange} osApiKey={osApiKey} />
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
        top10PercentIds={top10PercentIds}
        crownIds={crownIds}
      />
      {userLocation && <Marker position={userLocation} icon={createUserMarker()} />}
    </MapContainer>
  );
}
