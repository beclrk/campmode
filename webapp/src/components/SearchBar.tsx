import { useState, useEffect } from 'react';
import { Search, X, MapPin, Navigation } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  hasActiveLocation: boolean;
  onClearLocation: () => void;
}

interface AddressSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function SearchBar({
  value,
  onChange,
  onLocationSelect,
  hasActiveLocation,
  onClearLocation,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Fetch address suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length > 2) {
        setIsLoadingSuggestions(true);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=gb&limit=5`
          );
          const data = await response.json();
          setSuggestions(data);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
        setIsLoadingSuggestions(false);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSelect(
          position.coords.latitude,
          position.coords.longitude,
          'Your Location'
        );
        setIsFocused(false);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const shortName = suggestion.display_name.split(',')[0];
    onChange(shortName);
    onLocationSelect(
      parseFloat(suggestion.lat),
      parseFloat(suggestion.lon),
      shortName
    );
    setIsFocused(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity" />
        <div className="relative flex items-center bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-full px-4 h-12">
          <Search className="w-5 h-5 text-neutral-500 mr-3" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search locations..."
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-neutral-500"
          />
          {hasActiveLocation && (
            <button
              onClick={onClearLocation}
              className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/30 transition-colors"
            >
              <X className="w-4 h-4 text-blue-400" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[60vh] overflow-y-auto">
          {/* Use my location */}
          <button
            onClick={handleUseMyLocation}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors text-left border-b border-neutral-800"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-white font-medium">Use my location</p>
              <p className="text-neutral-500 text-sm">Find places near you</p>
            </div>
          </button>

          {/* Address suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs text-neutral-500 uppercase tracking-wider">
                Suggestions
              </p>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">
                      {suggestion.display_name.split(',')[0]}
                    </p>
                    <p className="text-neutral-500 text-sm truncate">
                      {suggestion.display_name.split(',').slice(1, 3).join(',')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading state */}
          {isLoadingSuggestions && (
            <div className="px-4 py-6 text-center text-neutral-500">
              Searching...
            </div>
          )}

          {/* Empty state */}
          {value.length > 2 && suggestions.length === 0 && !isLoadingSuggestions && (
            <div className="px-4 py-6 text-center text-neutral-500">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
