import { Location } from '@/types';

export interface Bounds {
  sw: [number, number];
  ne: [number, number];
}

/** Default UK bounds so we fetch real data on load before the map reports. */
export const DEFAULT_UK_BOUNDS: Bounds = {
  sw: [49.8, -8.6],
  ne: [60.9, 1.8],
};

/** Fetch all places in bounds from our API (Google Places + Open Charge Map, merged server-side so CORS is not an issue). */
export async function fetchGooglePlacesInBounds(bounds: Bounds): Promise<Location[]> {
  const { sw, ne } = bounds;
  const params = new URLSearchParams({
    swLat: String(sw[0]),
    swLng: String(sw[1]),
    neLat: String(ne[0]),
    neLng: String(ne[1]),
  });
  const base = typeof window !== 'undefined' ? '' : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const url = `${base}/api/places?${params}`;
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[CampMode] /api/places returned non-JSON (likely SPA HTML). Check vercel.json rewrites so /api/* is not rewritten to index.html.');
      }
      return [];
    }
    if (!res.ok) return [];
    const data = (await res.json()) as { locations?: Location[] };
    return Array.isArray(data.locations) ? data.locations : [];
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[CampMode] /api/places fetch failed:', e);
    }
    return [];
  }
}

/** Fetch all places in bounds (calls API which returns Google + OCM merged). */
export async function fetchAllPlacesInBounds(bounds: Bounds): Promise<Location[]> {
  return fetchGooglePlacesInBounds(bounds);
}
