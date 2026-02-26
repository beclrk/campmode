import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import MapView, { type BasemapId } from '@/components/map/MapView';
import LocationListView from '@/components/LocationListView';
import SearchBar from '@/components/SearchBar';
import FilterPills from '@/components/FilterPills';
import LocationSheet from '@/components/LocationSheet';
import UserMenu from '@/components/UserMenu';
import RoutePlannerPanel from '@/components/RoutePlannerPanel';
import AddToTripModal from '@/components/AddToTripModal';
import { useRouteGeometry } from '@/hooks/useRouteGeometry';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { usePlacesInBounds } from '@/hooks/usePlacesInBounds';
import { type Bounds, DEFAULT_UK_BOUNDS, fetchPlacesByIds, fetchTripById } from '@/services/placesApi';
import { Location, LocationType } from '@/types';
import { cn, qualityScore, getTop10PercentIds, getIdsWithFiveOrMorePhotos, normalizeLocationType, calculateDistance } from '@/lib/utils';
import { Route, Map as MapIcon, List } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useReviewsForLocation } from '@/hooks/useReviewsForLocation';

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: placeOrTripId } = useParams<{ id: string }>();
  const isPlaceRoute = location.pathname.startsWith('/place/');
  const isTripRoute = location.pathname.startsWith('/trip/');
  const placeId = isPlaceRoute ? placeOrTripId : undefined;
  const tripId = isTripRoute ? placeOrTripId : undefined;

  const [addToTripLocation, setAddToTripLocation] = useState<Location | null>(null);
  // Only campsites selected by default; user can enable rest stops and EV chargers via pills
  const [selectedTypes, setSelectedTypes] = useState<Set<LocationType>>(
    () => new Set<LocationType>(['campsite'])
  );
  const toggleType = useCallback((type: LocationType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeStops, setRouteStops] = useState<Location[]>([]);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [showRouteEmptyHint, setShowRouteEmptyHint] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>('default');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [listSortMode, setListSortMode] = useState<'quality' | 'distance'>('quality');
  const routeHintRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(DEFAULT_UK_BOUNDS);

  useEffect(() => {
    if (!showRouteEmptyHint) return;
    function handleClickOutside(e: MouseEvent) {
      if (routeHintRef.current && !routeHintRef.current.contains(e.target as Node)) {
        setShowRouteEmptyHint(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRouteEmptyHint]);
  const { user } = useAuth();
  const { addSaved, removeSaved, isSaved } = useSavedPlaces();
  const { locations: apiLocations } = usePlacesInBounds(bounds);
  const { reviews: locationReviews, loading: reviewsLoading, submitReview, deleteReview } = useReviewsForLocation(selectedLocation?.id ?? null);

  // Open location card when navigating from Saved Places
  useEffect(() => {
    const stateLocation = (location.state as { selectedLocation?: Location } | null)?.selectedLocation;
    if (stateLocation) {
      setSelectedLocation(stateLocation);
      setMapCenter([stateLocation.lat, stateLocation.lng]);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Load route from TripsPage "Open on map"
  useEffect(() => {
    const loadStops = (location.state as { loadRouteStops?: Location[] } | null)?.loadRouteStops;
    if (loadStops && Array.isArray(loadStops) && loadStops.length > 0) {
      setRouteStops(loadStops);
      setRoutePanelOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Share link /place/:id — fetch place and show on map
  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetchPlacesByIds([placeId]).then((locs) => {
      if (cancelled || locs.length === 0) return;
      const loc = locs[0];
      setSelectedLocation(loc);
      setMapCenter([loc.lat, loc.lng]);
      navigate('/', { replace: true });
    });
    return () => { cancelled = true; };
  }, [placeId, navigate]);

  // Share link /trip/:id — fetch trip and places, set route and open panel
  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    fetchTripById(tripId).then((trip) => {
      if (cancelled || !trip || trip.locationIds.length === 0) {
        if (!cancelled) navigate('/', { replace: true });
        return;
      }
      return fetchPlacesByIds(trip.locationIds).then((locs) => {
        if (cancelled) return;
        setRouteStops(locs);
        setRoutePanelOpen(true);
        navigate('/', { replace: true });
      });
    });
    return () => { cancelled = true; };
  }, [tripId, navigate]);

  const addToRoute = useCallback((location: Location) => {
    setRouteStops((prev) =>
      prev.some((s) => s.id === location.id) ? prev : [...prev, location]
    );
    setRoutePanelOpen(true);
  }, []);

  const removeFromRoute = useCallback((location: Location) => {
    setRouteStops((prev) => prev.filter((s) => s.id !== location.id));
  }, []);

  const removeStopAtIndex = useCallback((index: number) => {
    setRouteStops((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reorderRoute = useCallback((fromIndex: number, toIndex: number) => {
    setRouteStops((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const isInRoute = useCallback(
    (location: Location) => routeStops.some((s) => s.id === location.id),
    [routeStops]
  );

  const { positions: routePositions } = useRouteGeometry(userLocation, routeStops);

  // Only show locations from API (no sample data while loading)
  const baseLocations = apiLocations;

  /** When all three types are selected, cap EV chargers so campsites and rest stops aren't overwhelmed. */
  const MAX_EV_CHARGERS_WHEN_ALL_SELECTED = 300;

  /** Spatially sample locations so the cap is spread across the visible area (fixes EV chargers only loading in one part of the map). */
  const spatiallyCapLocations = useCallback((locations: Location[], maxCount: number): Location[] => {
    if (locations.length <= maxCount) return locations;
    const lats = locations.map((l) => l.lat);
    const lngs = locations.map((l) => l.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = maxLat - minLat || 1;
    const lngSpan = maxLng - minLng || 1;
    const GRID_SIZE = 10;
    const cells = new Map<string, Location[]>();
    for (const loc of locations) {
      const gi = Math.min(Math.floor(((loc.lat - minLat) / latSpan) * GRID_SIZE), GRID_SIZE - 1);
      const gj = Math.min(Math.floor(((loc.lng - minLng) / lngSpan) * GRID_SIZE), GRID_SIZE - 1);
      const key = `${gi},${gj}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(loc);
    }
    const perCell = Math.ceil(maxCount / cells.size);
    const out: Location[] = [];
    for (const list of cells.values()) {
      out.push(...list.slice(0, perCell));
    }
    return out.slice(0, maxCount);
  }, []);

  // Show locations whose type is in selectedTypes (clustering in MapView handles performance)
  const filteredLocations = useMemo(() => {
    let result = baseLocations.filter((loc) => selectedTypes.has(normalizeLocationType(loc.type ?? '')));

    if (selectedTypes.size === 3) {
      const campsites = result.filter((l) => normalizeLocationType(l.type ?? '') === 'campsite');
      const restStops = result.filter((l) => normalizeLocationType(l.type ?? '') === 'rest_stop');
      const evChargers = result.filter((l) => normalizeLocationType(l.type ?? '') === 'ev_charger');
      const evCapped = spatiallyCapLocations(evChargers, MAX_EV_CHARGERS_WHEN_ALL_SELECTED);
      result = [...campsites, ...restStops, ...evCapped];
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          (loc.description ?? '').toLowerCase().includes(query) ||
          (loc.address ?? '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [baseLocations, selectedTypes, searchQuery, spatiallyCapLocations]);

  // List view: sorted by quality (best first) or by distance when userLocation set
  const locationsSortedByQuality = useMemo(() => {
    return [...filteredLocations].sort((a, b) => qualityScore(b) - qualityScore(a));
  }, [filteredLocations]);

  const locationsForList = useMemo(() => {
    if (listSortMode === 'distance' && userLocation) {
      return [...filteredLocations].sort((a, b) => {
        const da = calculateDistance(userLocation[0], userLocation[1], a.lat, a.lng);
        const db = calculateDistance(userLocation[0], userLocation[1], b.lat, b.lng);
        return da - db;
      });
    }
    return locationsSortedByQuality;
  }, [filteredLocations, listSortMode, userLocation, locationsSortedByQuality]);

  // Gold star: top 10% per category by quality; gold crown: 5+ photos
  const top10PercentIds = useMemo(() => getTop10PercentIds(filteredLocations), [filteredLocations]);
  const crownIds = useMemo(() => getIdsWithFiveOrMorePhotos(filteredLocations), [filteredLocations]);

  const counts = useMemo(() => ({
    campsite: baseLocations.filter((l) => normalizeLocationType(l.type ?? '') === 'campsite').length,
    ev_charger: baseLocations.filter((l) => normalizeLocationType(l.type ?? '') === 'ev_charger').length,
    rest_stop: baseLocations.filter((l) => normalizeLocationType(l.type ?? '') === 'rest_stop').length,
  }), [baseLocations]);

  const handleLocationSelect = (lat: number, lng: number, _name: string) => {
    setUserLocation([lat, lng]);
    setMapCenter([lat, lng]);
    // Clear search text so we don't filter markers by the place name – show all locations near the selected place
    setSearchQuery('');
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    setMapCenter(undefined);
    setSearchQuery('');
  };

  /** When user clicks "Nearest" and location isn't set yet, request location first then sort by distance. */
  const handleSortByNearest = () => {
    if (userLocation) {
      setListSortMode('distance');
      return;
    }
    if (!navigator.geolocation) {
      setListSortMode('distance');
      return;
    }
    setListSortMode('distance');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
      },
      () => { /* leave listSortMode as distance; list will show quality until they grant location */ }
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map - always mounted so zoom/position persist when switching back from list view */}
      <div className={cn('absolute inset-0', viewMode === 'list' && 'hidden')}>
        <MapView
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
          center={mapCenter}
          userLocation={userLocation}
          routePositions={routePositions}
          onBoundsChange={(bounds) => {
            setBounds(bounds);
            setSearchQuery('');
          }}
          basemap={basemap}
          onBasemapChange={setBasemap}
          osApiKey={import.meta.env.VITE_OS_API_KEY}
          top10PercentIds={top10PercentIds}
          crownIds={crownIds}
          locationSheetOpen={!!selectedLocation}
        />
      </div>

      {/* List view - sort by quality or distance (always visible; default quality; Nearest requests location then sorts) */}
      {viewMode === 'list' && (
        <div className="absolute inset-0 pt-[220px] md:pt-[200px] flex flex-col min-h-0">
          <div className="flex-shrink-0 flex items-center justify-end gap-1 px-4 py-2">
            <span className="text-neutral-500 text-sm mr-1">Sort:</span>
            <button
              type="button"
              onClick={() => setListSortMode('quality')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                listSortMode === 'quality'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              )}
            >
              Quality
            </button>
            <button
              type="button"
              onClick={handleSortByNearest}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                listSortMode === 'distance'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              )}
            >
              Nearest
            </button>
          </div>
          <LocationListView
            locations={locationsForList}
            top10PercentIds={top10PercentIds}
            crownIds={crownIds}
            onSelect={setSelectedLocation}
            userLocation={userLocation}
          />
        </div>
      )}

      {/* Top controls - z-[1000] so they sit above Leaflet map panes (200-700) */}
      <div className="absolute top-0 left-0 right-0 z-[1000] safe-top">
        <div className="bg-gradient-to-b from-neutral-950/90 via-neutral-950/60 to-transparent pb-8 pt-4 px-4">
          {/* Search row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onLocationSelect={handleLocationSelect}
                hasActiveLocation={!!userLocation}
                onClearLocation={handleClearLocation}
              />
            </div>
            <div ref={routeHintRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (routeStops.length > 0) {
                    setRoutePanelOpen((o) => !o);
                    setShowRouteEmptyHint(false);
                  } else {
                    setShowRouteEmptyHint((h) => !h);
                  }
                }}
                className={cn(
                  'relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                  routeStops.length > 0
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                )}
                aria-label="Route planner"
                title="Route planner"
              >
                <Route className="w-5 h-5" />
                {routeStops.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">
                    {routeStops.length}
                  </span>
                )}
              </button>
              {showRouteEmptyHint && routeStops.length === 0 && (
                <div className="absolute top-full right-0 mt-2 z-[1001] w-64 p-3 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl text-left">
                  <p className="text-sm text-neutral-200">
                    Add locations to your route first. Tap a place on the map, then tap &quot;Add to route&quot; in the location card.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRouteEmptyHint(false)}
                    className="mt-2 text-sm text-green-500 hover:text-green-400 font-medium"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
            <UserMenu />
          </div>

          {/* Filter pills: only campsites on by load; tap to add Rest Stops and/or EV Chargers */}
          <FilterPills
            selectedTypes={selectedTypes}
            onToggleType={toggleType}
            counts={counts}
          />

          {/* View toggle: Map (default) | List */}
          <div className="flex gap-1 mt-3">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                viewMode === 'map'
                  ? 'bg-green-500/55 backdrop-blur-sm border border-green-400/25 text-white'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
              )}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-green-500/55 backdrop-blur-sm border border-green-400/25 text-white'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
              )}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Location detail sheet */}
      {selectedLocation && (
        <LocationSheet
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          reviews={locationReviews}
          reviewsLoading={reviewsLoading}
          userLocation={userLocation}
          isInRoute={isInRoute(selectedLocation)}
          onAddToRoute={() => addToRoute(selectedLocation)}
          onRemoveFromRoute={() => removeFromRoute(selectedLocation)}
          isSaved={selectedLocation ? isSaved(selectedLocation.id) : false}
          onSave={() => selectedLocation && addSaved(selectedLocation)}
          onUnsave={() => selectedLocation && removeSaved(selectedLocation.id)}
          onAddToTrip={() => selectedLocation && setAddToTripLocation(selectedLocation)}
          onSubmitReview={submitReview}
          onDeleteReview={deleteReview}
          currentUserId={user?.id}
        />
      )}

      {addToTripLocation && (
        <AddToTripModal
          location={addToTripLocation}
          onClose={() => setAddToTripLocation(null)}
          onAdded={() => setAddToTripLocation(null)}
        />
      )}

      {/* Route planner panel - shows when route has stops and user opens it */}
      {routePanelOpen && routeStops.length > 0 && (
        <RoutePlannerPanel
          stops={routeStops}
          onClose={() => setRoutePanelOpen(false)}
          onRemoveStop={removeStopAtIndex}
          onReorder={reorderRoute}
          onSelectStop={(location) => {
            setSelectedLocation(location);
            setRoutePanelOpen(false);
          }}
        />
      )}
    </div>
  );
}
