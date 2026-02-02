import { Tent, Zap, Coffee, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationType } from '@/types';

interface FilterPillsProps {
  activeFilter: LocationType | 'all';
  onFilterChange: (filter: LocationType | 'all') => void;
  counts: {
    all: number;
    campsite: number;
    ev_charger: number;
    rest_stop: number;
  };
}

const filters = [
  { key: 'all', label: 'All', icon: MapPin, color: 'neutral' },
  { key: 'campsite', label: 'Campsites', icon: Tent, color: 'green' },
  { key: 'ev_charger', label: 'EV Chargers', icon: Zap, color: 'blue' },
  { key: 'rest_stop', label: 'Rest Stops', icon: Coffee, color: 'amber' },
] as const;

export default function FilterPills({ activeFilter, onFilterChange, counts }: FilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
      {filters.map(({ key, label, icon: Icon, color }) => {
        const isActive = activeFilter === key;
        const count = counts[key as keyof typeof counts];
        
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key as LocationType | 'all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              isActive
                ? color === 'green'
                  ? 'bg-green-500 text-white'
                  : color === 'blue'
                  ? 'bg-blue-500 text-white'
                  : color === 'amber'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-neutral-900'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              isActive 
                ? 'bg-white/20'
                : 'bg-neutral-700'
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
