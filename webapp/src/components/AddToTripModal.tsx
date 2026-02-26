import { useState } from 'react';
import { X, Route, Plus } from 'lucide-react';
import { useTrips } from '@/hooks/useTrips';
import { Location } from '@/types';

interface AddToTripModalProps {
  location: Location;
  onClose: () => void;
  onAdded?: () => void;
}

export default function AddToTripModal({ location, onClose, onAdded }: AddToTripModalProps) {
  const { trips, createTrip, updateTrip, addLocationToTrip } = useTrips();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const addToTrip = async (tripId: string) => {
    const ok = await addLocationToTrip(tripId, location.id);
    if (ok) {
      onAdded?.();
      onClose();
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newName.trim() || 'New trip';
    const trip = await createTrip(name);
    setNewName('');
    setCreating(false);
    if (trip) {
      const ok = await updateTrip(trip.id, { locationIds: [location.id] });
      if (ok) {
        onAdded?.();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Add to trip</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 pt-2 text-neutral-400 text-sm truncate">{location.name}</p>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {creating ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Trip name"
                className="w-full px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateAndAdd}
                  className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl"
                >
                  Create & add
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
            <>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-neutral-600 text-neutral-400 hover:border-green-500 hover:text-green-500 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create new trip
              </button>
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => addToTrip(trip.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-left transition-colors"
                >
                  <Route className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-white font-medium truncate flex-1">{trip.name}</span>
                  <span className="text-neutral-500 text-sm">{trip.locationIds.length} stop{trip.locationIds.length !== 1 ? 's' : ''}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
