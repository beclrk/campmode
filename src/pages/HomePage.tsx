import { useState, useMemo } from 'react';
import MapView from '@/components/map/MapView';
import SearchBar from '@/components/SearchBar';
import FilterPills from '@/components/FilterPills';
import LocationSheet from '@/components/LocationSheet';
import UserMenu from '@/components/UserMenu';
import { sampleLocations } from '@/data/locations';
import { Location, LocationType, Review } from '@/types';

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
  const [filter, setFilter] = useState<LocationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Filter locations
  const filteredLocations = useMemo(() => {
    let result = sampleLocations;

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
  }, [filter, searchQuery]);

  // Count by type
  const counts = useMemo(() => ({
    all: sampleLocations.length,
    campsite: sampleLocations.filter((l) => l.type === 'campsite').length,
    ev_charger: sampleLocations.filter((l) => l.type === 'ev_charger').length,
    rest_stop: sampleLocations.filter((l) => l.type === 'rest_stop').length,
  }), []);

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
        />
      )}
    </div>
  );
}
