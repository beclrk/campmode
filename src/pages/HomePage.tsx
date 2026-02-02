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
import type { Bounds } from '@/services/placesApi';
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
  const [bounds, setBounds] = useState<Bounds | null>(null);
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

  // Use real-world data when we have bounds and API returned results; otherwise sample data
  const baseLocations = (bounds && apiLocations.length > 0) ? apiLocations : sampleLocations;

  // Filter locations
  const filteredLocations = useMemo(() => {
    let result = baseLocations;

    // Filter by type
    if (filter !== 'all') {
      result = result.filter((loc) => loc.type === filter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.description.toLowerCase().includes(query) ||
          loc.address.toLowerCase().includes(query)
      );
    }

    return result;
  }, [baseLocations, filter, searchQuery]);

  // Count by type
  const counts = useMemo(() => ({
    all: baseLocations.length,
    campsite: baseLocations.filter((l) => l.type === 'campsite').length,
    ev_charger: baseLocations.filter((l) => l.type === 'ev_charger').length,
    rest_stop: baseLocations.filter((l) => l.type === 'rest_stop').length,
  }), [baseLocations]);

  // Get reviews for selected location
  const locationReviews = useMemo(() => {
    if (!selectedLocation) return [];
    return sampleReviews.filter((r) => r.location_id === selectedLocation.id);
  }, [selectedLocation]);

  const handleLocationSelect = (lat: number, lng: number, _name: string) => {
    setUserLocation([lat, lng]);
    setMapCenter([lat, lng]);
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
