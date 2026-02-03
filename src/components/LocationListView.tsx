import { Tent, Zap, Coffee, Crown } from 'lucide-react';
import { Location } from '@/types';
import { getLocationTypeColor, getLocationTypeLabel, formatDistanceMiles, cn } from '@/lib/utils';
import { calculateDistance } from '@/lib/utils';

const TYPE_ICONS = { campsite: Tent, rest_stop: Coffee, ev_charger: Zap };

interface LocationListViewProps {
  locations: Location[];
  top10PercentIds: Set<string>;
  onSelect: (location: Location) => void;
  userLocation: [number, number] | null;
}

export default function LocationListView({
  locations,
  top10PercentIds,
  onSelect,
  userLocation,
}: LocationListViewProps) {
  return (
    <div className="h-full overflow-y-auto p-4 pb-24 list-view-scroll-bottom">
      <ul className="space-y-2">
        {locations.map((loc) => {
          const type = loc.type ?? 'campsite';
          const Icon = TYPE_ICONS[type] ?? Tent;
          const color = getLocationTypeColor(type);
          const isTop10 = top10PercentIds.has(loc.id);
          const reviewCount = loc.review_count ?? loc.user_ratings_total ?? 0;
          const distance =
            userLocation != null
              ? calculateDistance(userLocation[0], userLocation[1], loc.lat, loc.lng)
              : null;

          return (
            <li key={loc.id}>
              <button
                type="button"
                onClick={() => onSelect(loc)}
                className={cn(
                  'w-full text-left rounded-xl border transition-colors',
                  'bg-neutral-900/80 border-neutral-800 hover:bg-neutral-800/80 hover:border-neutral-700',
                  'p-4 flex items-start gap-3'
                )}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  {isTop10 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-amber-400/90 text-amber-900 shadow"
                      title="Top 10% in category"
                      aria-label="Top 10% in category"
                    >
                      <Crown className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white truncate">{loc.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ backgroundColor: `${color}30`, color }}
                    >
                      {getLocationTypeLabel(type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-neutral-400">
                    {loc.rating != null && (
                      <span>
                        {Number(loc.rating).toFixed(1)} ★
                        {reviewCount > 0 && <span className="ml-0.5">({reviewCount})</span>}
                      </span>
                    )}
                    {distance != null && (
                      <span>{formatDistanceMiles(distance)}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
