import { Location } from '@/types';

export interface Bounds {
  sw: [number, number];
  ne: [number, number];
}

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
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { locations?: Location[] };
  return Array.isArray(data.locations) ? data.locations : [];
}

/** Fetch all places in bounds (calls API which returns Google + OCM merged). */
export async function fetchAllPlacesInBounds(bounds: Bounds): Promise<Location[]> {
  return fetchGooglePlacesInBounds(bounds);
}
