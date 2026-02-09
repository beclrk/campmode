import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Route, Plus, Trash2, MapPin, Share2 } from 'lucide-react';
import { useTrips } from '@/hooks/useTrips';
import { fetchPlacesByIds } from '@/services/placesApi';
import { getLocationTypeLabel, getLocationTypeColor } from '@/lib/utils';
import { Location } from '@/types';
import { Tent, Zap, Coffee } from 'lucide-react';

function TypeIcon({ type }: { type: Location['type'] }) {
  const color = getLocationTypeColor(type);
  if (type === 'campsite') return <Tent className="w-5 h-5 shrink-0" style={{ color }} />;
  if (type === 'ev_charger') return <Zap className="w-5 h-5 shrink-0" style={{ color }} />;
  return <Coffee className="w-5 h-5 shrink-0" style={{ color }} />;
}

export default function TripsPage() {
  const navigate = useNavigate();
  const { trips, loading, createTrip, deleteTrip } = useTrips();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tripLocations, setTripLocations] = useState<Record<string, Location[]>>({});

  const loadTripLocations = async (tripId: string, locationIds: string[]) => {
    if (locationIds.length === 0) {
      setTripLocations((prev) => ({ ...prev, [tripId]: [] }));
      return;
    }
    const locs = await fetchPlacesByIds(locationIds);
    setTripLocations((prev) => ({ ...prev, [tripId]: locs }));
  };

  const handleCreateTrip = async () => {
    const name = newName.trim() || 'New trip';
    await createTrip(name);
    setNewName('');
    setCreating(false);
  };

  const handleOpenOnMap = async (_tripId: string, locationIds: string[]) => {
    if (locationIds.length === 0) return;
    const locs = await fetchPlacesByIds(locationIds);
    navigate('/', { state: { loadRouteStops: locs }, replace: false });
  };

  const handleShareTrip = (tripId: string) => {
    const url = `${window.location.origin}/trip/${tripId}`;
    if (navigator.share) {
      navigator.share({ title: 'Trip', url }).catch(() => copyAndNotify(url));
    } else {
      copyAndNotify(url);
    }
  };

  function copyAndNotify(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      if (typeof window !== 'undefined' && window.alert) window.alert('Link copied to clipboard');
    });
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-neutral-950 to-neutral-950" />

      <header className="relative z-10 flex items-center gap-4 px-4 py-4 border-b border-neutral-800 safe-top">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">My Trips</h1>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-12">
        {creating ? (
          <div className="mb-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Trip name"
              className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleCreateTrip}
                className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); }}
                className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-4 border border-dashed border-neutral-600 text-neutral-400 rounded-xl hover:border-green-500 hover:text-green-500 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New trip
          </button>
        )}

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading trips…</p>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
              <Route className="w-8 h-8 text-neutral-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No trips yet</h2>
            <p className="text-neutral-400 text-sm max-w-[260px]">
              Create a trip and add places from the map. Then open the full route in Maps or share the link.
            </p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-6 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
            >
              Create trip
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(expandedId === trip.id ? null : trip.id);
                    if (expandedId !== trip.id && trip.locationIds.length > 0 && !tripLocations[trip.id]) {
                      loadTripLocations(trip.id, trip.locationIds);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                    <Route className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{trip.name}</p>
                    <p className="text-neutral-500 text-sm">{trip.locationIds.length} stop{trip.locationIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleShareTrip(trip.id)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      aria-label="Share trip"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this trip?')) await deleteTrip(trip.id);
                      }}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-neutral-800 transition-colors"
                      aria-label="Delete trip"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </button>

                {expandedId === trip.id && (
                  <div className="px-4 pb-4 border-t border-neutral-800 pt-3">
                    {trip.locationIds.length === 0 ? (
                      <p className="text-neutral-500 text-sm">No places yet. Add places from the map.</p>
                    ) : (
                      <>
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => handleOpenOnMap(trip.id, trip.locationIds)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl text-sm"
                          >
                            <MapPin className="w-4 h-4" />
                            Open on map
                          </button>
                        </div>
                        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                          {(tripLocations[trip.id] ?? []).map((loc) => (
                            <li
                              key={loc.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-neutral-800/50"
                            >
                              <TypeIcon type={loc.type} />
                              <span className="text-sm text-white truncate flex-1">{loc.name}</span>
                              <span className="text-xs text-neutral-500">{getLocationTypeLabel(loc.type)}</span>
                            </li>
                          ))}
                          {trip.locationIds.length > 0 && !tripLocations[trip.id] && (
                            <li className="text-neutral-500 text-sm">Loading…</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
