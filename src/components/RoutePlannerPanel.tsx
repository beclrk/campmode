import { useState } from 'react';
import { Location } from '@/types';
import {
  X,
  Route,
  Navigation,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { getLocationTypeLabel } from '@/lib/utils';

const APPLE_MAPS_BASE = 'https://maps.apple.com/?daddr=';
const GOOGLE_MAPS_BASE = 'https://www.google.com/maps/dir/?api=1&destination=';

interface RoutePlannerPanelProps {
  stops: Location[];
  onClose: () => void;
  onRemoveStop: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function openInAppleMaps(lat: number, lng: number) {
  window.open(`${APPLE_MAPS_BASE}${lat},${lng}`, '_blank');
}

function openInGoogleMaps(lat: number, lng: number) {
  window.open(`${GOOGLE_MAPS_BASE}${lat},${lng}`, '_blank');
}

export default function RoutePlannerPanel({
  stops,
  onClose,
  onRemoveStop,
  onReorder,
}: RoutePlannerPanelProps) {
  const [showMapsPicker, setShowMapsPicker] = useState(false);
  const nextStop = stops[0];

  const handleOpenInMaps = (app: 'apple' | 'google') => {
    if (!nextStop) return;
    setShowMapsPicker(false);
    if (app === 'apple') openInAppleMaps(nextStop.lat, nextStop.lng);
    else openInGoogleMaps(nextStop.lat, nextStop.lng);
  };

  if (stops.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] location-sheet-wrapper">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex flex-col bg-neutral-900 rounded-t-3xl max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-white">Your route</h2>
            <span className="text-neutral-500 text-sm">({stops.length} stop{stops.length !== 1 ? 's' : ''})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Open next stop in Maps */}
        {nextStop && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-800">
            <p className="text-neutral-400 text-sm mb-2">Navigate to next stop</p>
            {!showMapsPicker ? (
              <button
                type="button"
                onClick={() => setShowMapsPicker(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                <Navigation className="w-5 h-5" />
                Open in Maps — {nextStop.name}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenInMaps('apple')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
                >
                  Apple Maps
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenInMaps('google')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
                >
                  Google Maps
                </button>
                <button
                  type="button"
                  onClick={() => setShowMapsPicker(false)}
                  className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
                  aria-label="Back"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <p className="text-neutral-500 text-xs mt-2">
              Opens your chosen app with this stop. The full route stays here.
            </p>
          </div>
        )}

        {/* Stops list - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto sheet-scroll hide-scrollbar px-4 py-3 pb-28">
          <ul className="space-y-2">
            {stops.map((stop, index) => (
              <li
                key={`${stop.id}-${index}`}
                className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{stop.name}</p>
                  <p className="text-neutral-500 text-xs">{getLocationTypeLabel(stop.type)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => index > 0 && onReorder(index, index - 1)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => index < stops.length - 1 && onReorder(index, index + 1)}
                    disabled={index === stops.length - 1}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveStop(index)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-neutral-700 transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
