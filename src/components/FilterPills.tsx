import { Tent, Zap, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationType } from '@/types';

interface FilterPillsProps {
  /** Types that are selected (shown on map). Default all selected; click toggles off. */
  selectedTypes: Set<LocationType>;
  onToggleType: (type: LocationType) => void;
  counts: {
    campsite: number;
    ev_charger: number;
    rest_stop: number;
  };
}

/** Order: Campsites, Rest Stops, EV Chargers */
const filters: { key: LocationType; label: string; icon: typeof Tent; color: 'green' | 'amber' | 'blue' }[] = [
  { key: 'campsite', label: 'Campsites', icon: Tent, color: 'green' },
  { key: 'rest_stop', label: 'Rest Stops', icon: Coffee, color: 'amber' },
  { key: 'ev_charger', label: 'EV Chargers', icon: Zap, color: 'blue' },
];

export default function FilterPills({ selectedTypes, onToggleType, counts }: FilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
      {filters.map(({ key, label, icon: Icon, color }) => {
        const isSelected = selectedTypes.has(key);
        const count = counts[key];

        return (
          <button
            key={key}
            onClick={() => onToggleType(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              isSelected
                ? color === 'green'
                  ? 'bg-green-500 text-white'
                  : color === 'blue'
                  ? 'bg-blue-500 text-white'
                  : 'bg-amber-500 text-white'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              isSelected ? 'bg-white/20' : 'bg-neutral-700'
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
