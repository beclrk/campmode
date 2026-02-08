/**
 * Places and trips are read directly from Supabase (client). No /api/places or /api/trip calls.
 * API is reserved for sync/updates (e.g. /api/sync-places).
 * Requires: Supabase RLS allows SELECT on locations (e.g. public or anon). For trip share links,
 * RLS on trips must allow SELECT by id (e.g. policy for anon or any user).
 */
import { Location } from '@/types';
import { supabase } from '@/lib/supabase';

export interface Bounds {
  sw: [number, number];
  ne: [number, number];
}

/** Default UK bounds so we fetch real data on load before the map reports. */
export const DEFAULT_UK_BOUNDS: Bounds = {
  sw: [49.8, -8.6],
  ne: [60.9, 1.8],
};

/** UK bounds for clamping (same as API). */
const UK_BOUNDS = { swLat: 49.8, swLng: -8.6, neLat: 60.9, neLng: 1.8 };

function clampBoundsToUK(
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number
): [number, number, number, number] {
  return [
    Math.max(swLat, UK_BOUNDS.swLat),
    Math.max(swLng, UK_BOUNDS.swLng),
    Math.min(neLat, UK_BOUNDS.neLat),
    Math.min(neLng, UK_BOUNDS.neLng),
  ];
}

function inUK(lat: number, lng: number): boolean {
  return (
    lat >= UK_BOUNDS.swLat &&
    lat <= UK_BOUNDS.neLat &&
    lng >= UK_BOUNDS.swLng &&
    lng <= UK_BOUNDS.neLng
  );
}

/** Row shape from Supabase locations table. */
interface PlacesDbRow {
  id?: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  description: string;
  address: string;
  price?: string | null;
  facilities: string[];
  images: string[];
  website?: string | null;
  phone?: string | null;
  google_place_id?: string | null;
  external_id: string;
  external_source: string;
  rating?: number | null;
  review_count?: number | null;
  price_level?: number | null;
  opening_hours?: unknown;
  created_at: string;
  updated_at: string;
}

function rowToLocation(r: PlacesDbRow, now: string): Location {
  return {
    id: r.id || `${r.external_source}-${r.external_id}`,
    name: r.name ?? '',
    type: (r.type === 'ev_charger' ? 'ev_charger' : r.type === 'rest_stop' ? 'rest_stop' : 'campsite') as Location['type'],
    lat: r.lat,
    lng: r.lng,
    description: r.description ?? '',
    address: r.address ?? '',
    facilities: Array.isArray(r.facilities) ? r.facilities : [],
    images: Array.isArray(r.images) ? r.images : [],
    google_place_id: r.google_place_id ?? undefined,
    ocm_id: r.external_source === 'open_charge_map' ? parseInt(String(r.external_id), 10) : undefined,
    website: r.website ?? undefined,
    phone: r.phone ?? undefined,
    rating: r.rating != null ? Number(r.rating) : undefined,
    user_ratings_total: r.review_count != null ? Number(r.review_count) : undefined,
    review_count: r.review_count != null ? Number(r.review_count) : undefined,
    price_level: r.price_level != null ? Number(r.price_level) : undefined,
    opening_hours: r.opening_hours ?? undefined,
    created_at: r.created_at ?? now,
    updated_at: r.updated_at ?? now,
  };
}

/** Last successful response – used when Supabase fails so the map keeps showing data. */
let lastGoodLocations: Location[] = [];

const LOCATIONS_SELECT =
  'id, name, type, lat, lng, description, address, price, facilities, images, website, phone, google_place_id, external_id, external_source, rating, review_count, price_level, opening_hours, created_at, updated_at';

const PAGE_SIZE = 1000;
const MAX_LOCATIONS_IN_BOUNDS = 5000;

/** Fetch places in bounds directly from Supabase (client). No API call. */
export async function fetchAllPlacesInBounds(bounds: Bounds): Promise<Location[]> {
  const { sw, ne } = bounds;
  const [cSwLat, cSwLng, cNeLat, cNeLng] = clampBoundsToUK(sw[0], sw[1], ne[0], ne[1]);
  const now = new Date().toISOString();

  try {
    const allRows: PlacesDbRow[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && allRows.length < MAX_LOCATIONS_IN_BOUNDS) {
      const { data: rows, error } = await supabase
        .from('locations')
        .select(LOCATIONS_SELECT)
        .gte('lat', cSwLat)
        .lte('lat', cNeLat)
        .gte('lng', cSwLng)
        .lte('lng', cNeLng)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.warn('[CampMode] Supabase places error:', error);
        return lastGoodLocations;
      }

      const page = (rows ?? []) as unknown as PlacesDbRow[];
      allRows.push(...page);
      hasMore = page.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    const locations = allRows
      .filter((r) => inUK(r.lat, r.lng))
      .map((r) => rowToLocation(r, now));

    if (locations.length > 0) lastGoodLocations = locations;
    if (import.meta.env?.DEV) {
      console.log('[CampMode] Supabase places:', allRows.length, 'rows,', locations.length, 'in UK');
    }
    return locations;
  } catch (e) {
    console.warn('[CampMode] Supabase places fetch failed, using last known good:', e);
    return lastGoodLocations;
  }
}

/** Fetch places by id list directly from Supabase (client). */
export async function fetchPlacesByIds(ids: string[]): Promise<Location[]> {
  if (ids.length === 0) return [];
  const slice = ids.slice(0, 100);
  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from('locations')
    .select(LOCATIONS_SELECT)
    .in('id', slice);

  if (error) {
    console.warn('[CampMode] Supabase places by ids error:', error);
    return [];
  }

  const allRows = (rows ?? []) as unknown as PlacesDbRow[];
  return allRows
    .filter((r) => inUK(r.lat, r.lng))
    .map((r) => rowToLocation(r, now));
}

export interface TripInfo {
  id: string;
  name: string;
  locationIds: string[];
}

/** Fetch trip by id directly from Supabase (client). For share links, RLS must allow read (e.g. policy for anon or any user by id). */
export async function fetchTripById(id: string): Promise<TripInfo | null> {
  const { data: row, error } = await supabase
    .from('trips')
    .select('id, name, locations')
    .eq('id', id)
    .single();

  if (error || !row) {
    if (error) console.warn('[CampMode] Supabase trip by id error:', error);
    return null;
  }

  const locations = (row as { locations?: string[] }).locations ?? [];
  const locationIds = Array.isArray(locations) ? locations.filter((x): x is string => typeof x === 'string') : [];

  return {
    id: (row as { id: string }).id,
    name: (row as { name: string }).name ?? '',
    locationIds,
  };
}
