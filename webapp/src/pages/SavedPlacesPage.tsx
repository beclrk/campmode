import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, ChevronRight } from 'lucide-react';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { getLocationTypeLabel, getLocationTypeColor } from '@/lib/utils';
import { Location } from '@/types';
import { Tent, Zap, Coffee } from 'lucide-react';

function TypeIcon({ type }: { type: Location['type'] }) {
  const color = getLocationTypeColor(type);
  if (type === 'campsite') return <Tent className="w-5 h-5 shrink-0" style={{ color }} />;
  if (type === 'ev_charger') return <Zap className="w-5 h-5 shrink-0" style={{ color }} />;
  return <Coffee className="w-5 h-5 shrink-0" style={{ color }} />;
}

export default function SavedPlacesPage() {
  const navigate = useNavigate();
  const { savedPlaces, removeSaved } = useSavedPlaces();

  const handleSelect = (location: Location) => {
    navigate('/', { state: { selectedLocation: location }, replace: false });
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-neutral-950 to-neutral-950" />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 px-4 py-4 border-b border-neutral-800 safe-top">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Saved Places</h1>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-12">
        {savedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-neutral-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No saved places yet</h2>
            <p className="text-neutral-400 text-sm max-w-[260px]">
              Tap the heart on a location card on the map to save it here. Great for planning trips or remembering spots you like.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
            >
              Explore map
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {savedPlaces.map((location) => (
              <li
                key={location.id}
                className="flex items-center gap-3 p-4 bg-neutral-900/80 border border-neutral-800 rounded-xl hover:bg-neutral-800/80 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(location)}
                  className="flex-1 flex items-center gap-3 min-w-0 text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${getLocationTypeColor(location.type)}20` }}
                  >
                    <TypeIcon type={location.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{location.name}</p>
                    <p className="text-neutral-500 text-sm">{getLocationTypeLabel(location.type)}</p>
                    <p className="text-neutral-500 text-xs truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {location.address}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-500 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSaved(location.id);
                  }}
                  className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors shrink-0"
                  aria-label="Remove from saved"
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
