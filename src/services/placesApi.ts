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

/** Last successful response – used when API fails so the map keeps showing data. */
let lastGoodLocations: Location[] = [];

/** Fetch all places in bounds from our API. On failure, returns last known good data so the map stays usable. */
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
        console.warn('[CampMode] /api/places returned non-JSON. Using last known good data.');
      }
      return lastGoodLocations;
    }
    if (!res.ok) {
      return lastGoodLocations;
    }
    const data = (await res.json()) as { locations?: Location[] } | Location[];
    const raw = Array.isArray(data) ? data : (Array.isArray(data.locations) ? data.locations : []);
    const locations = raw.filter(
      (loc): loc is Location =>
        loc != null &&
        typeof loc.id === 'string' &&
        typeof loc.lat === 'number' &&
        typeof loc.lng === 'number' &&
        !Number.isNaN(loc.lat) &&
        !Number.isNaN(loc.lng)
    );
    if (locations.length > 0) lastGoodLocations = locations;
    if (import.meta.env?.DEV) {
      console.log('[CampMode] /api/places:', raw.length, 'raw,', locations.length, 'valid');
    } else if (raw.length > 0 && locations.length === 0) {
      console.warn('[CampMode] /api/places returned', raw.length, 'items but none had valid id/lat/lng');
    }
    return locations;
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[CampMode] /api/places fetch failed, using last known good:', e);
    }
    return lastGoodLocations;
  }
}

/** Fetch all places in bounds (calls API which returns Google + OCM merged). */
export async function fetchAllPlacesInBounds(bounds: Bounds): Promise<Location[]> {
  return fetchGooglePlacesInBounds(bounds);
}
