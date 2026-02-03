import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MapView from '@/components/map/MapView';
import SearchBar from '@/components/SearchBar';
import FilterPills from '@/components/FilterPills';
import LocationSheet from '@/components/LocationSheet';
import UserMenu from '@/components/UserMenu';
import RoutePlannerPanel from '@/components/RoutePlannerPanel';
import { useRouteGeometry } from '@/hooks/useRouteGeometry';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { usePlacesInBounds } from '@/hooks/usePlacesInBounds';
import { sampleLocations } from '@/data/locations';
import { type Bounds, DEFAULT_UK_BOUNDS } from '@/services/placesApi';
import { Location, LocationType, Review } from '@/types';
import { cn } from '@/lib/utils';
import { Route } from 'lucide-react';

// Sample reviews - in production these come from Supabase
const sampleReviews: Review[] = [
  {
    id: '1',
    location_id: '1',
    user_id: 'user1',
    user_name: 'Sarah M.',
    rating: 5,
    comment: 'Absolutely stunning location. The facilities were clean and the views incredible. Will definitely be back!',
    photos: [],
    created_at: '2024-11-15T10:00:00Z',
  },
  {
    id: '2',
    location_id: '1',
    user_id: 'user2',
    user_name: 'James T.',
    rating: 4,
    comment: 'Great campsite, got a bit busy on the weekend but still had a lovely time. Electric hookups worked perfectly.',
    photos: [],
    created_at: '2024-11-10T10:00:00Z',
  },
];

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<LocationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeStops, setRouteStops] = useState<Location[]>([]);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(DEFAULT_UK_BOUNDS);
  const { addSaved, removeSaved, isSaved } = useSavedPlaces();
  const { locations: apiLocations } = usePlacesInBounds(bounds);

  // Open location card when navigating from Saved Places
  useEffect(() => {
    const stateLocation = (location.state as { selectedLocation?: Location } | null)?.selectedLocation;
    if (stateLocation) {
      setSelectedLocation(stateLocation);
      setMapCenter([stateLocation.lat, stateLocation.lng]);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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

  // Normalize type so filter/counts work even if API sends 'campground' etc.
  const normalizeType = (type: string): LocationType =>
    type === 'ev_charger' ? 'ev_charger' : type === 'rest_stop' ? 'rest_stop' : 'campsite';

  // Prefer real-world data whenever we have any from the API; otherwise sample data
  const baseLocations = apiLocations.length > 0 ? apiLocations : sampleLocations;

  // Show all locations at any zoom (clustering in MapView handles performance)
  const filteredLocations = useMemo(() => {
    let result = baseLocations;

    // Filter by type (use normalized type so campsite/campground both match)
    if (filter !== 'all') {
      result = result.filter((loc) => normalizeType(loc.type ?? '') === filter);
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

    // When a category has no results from API, show sample locations of that type so the map isn't empty
    if (filter !== 'all' && result.length === 0 && baseLocations.length > 0) {
      const sampleOfType = sampleLocations.filter((l) => normalizeType(l.type ?? '') === filter);
      result = sampleOfType;
    }

    return result;
  }, [baseLocations, filter, searchQuery]);

  // Count by type (from full base so pills show total available; use normalized type)
  const counts = useMemo(() => ({
    all: baseLocations.length,
    campsite: baseLocations.filter((l) => normalizeType(l.type ?? '') === 'campsite').length,
    ev_charger: baseLocations.filter((l) => normalizeType(l.type ?? '') === 'ev_charger').length,
    rest_stop: baseLocations.filter((l) => normalizeType(l.type ?? '') === 'rest_stop').length,
  }), [baseLocations]);

  // Get reviews for selected location
  const locationReviews = useMemo(() => {
    if (!selectedLocation) return [];
    return sampleReviews.filter((r) => r.location_id === selectedLocation.id);
  }, [selectedLocation]);

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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        <MapView
          locations={filteredLocations}
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
          center={mapCenter}
          userLocation={userLocation}
          routePositions={routePositions}
          onBoundsChange={setBounds}
        />
      </div>

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
            <button
              type="button"
              onClick={() => setRoutePanelOpen((o) => !o)}
              className={cn(
                'relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
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
            <UserMenu />
          </div>

          {/* Filter pills */}
          <FilterPills
            activeFilter={filter}
            onFilterChange={setFilter}
            counts={counts}
          />
        </div>
      </div>

      {/* Location detail sheet */}
      {selectedLocation && (
        <LocationSheet
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          reviews={locationReviews}
          userLocation={userLocation}
          isInRoute={isInRoute(selectedLocation)}
          onAddToRoute={() => addToRoute(selectedLocation)}
          onRemoveFromRoute={() => removeFromRoute(selectedLocation)}
          isSaved={selectedLocation ? isSaved(selectedLocation.id) : false}
          onSave={() => selectedLocation && addSaved(selectedLocation)}
          onUnsave={() => selectedLocation && removeSaved(selectedLocation.id)}
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
