import { useState, useEffect, useRef } from 'react';
import { Location } from '@/types';
import { fetchAllPlacesInBounds, type Bounds } from '@/services/placesApi';

const DEBOUNCE_MS = 400;

export function usePlacesInBounds(bounds: Bounds | null) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bounds) return;

    const key = `${bounds.sw[0].toFixed(4)},${bounds.sw[1].toFixed(4)},${bounds.ne[0].toFixed(4)},${bounds.ne[1].toFixed(4)}`;
    if (lastBoundsRef.current === key) return;

    const doFetch = () => {
      lastBoundsRef.current = key;
      setLoading(true);
      fetchAllPlacesInBounds(bounds)
        .then((list) => {
          setLocations((prev) => (list.length > 0 ? list : prev));
        })
        .catch(() => {
          setLocations((prev) => prev);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    const isInitial = lastBoundsRef.current === null;
    if (isInitial) {
      doFetch();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      doFetch();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bounds]);

  return { locations, loading };
}
