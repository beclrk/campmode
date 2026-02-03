import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

/** UK only: bounds for Great Britain + Northern Ireland. */
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

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const OCM_BASE = 'https://api.openchargemap.io/v3/poi/';
const PLACE_TYPES = ['campground', 'rest_stop', 'electric_vehicle_charging_station'] as const;
/** Google Places max radius (m). We cover the full visible bounds with a grid of requests. */
const GOOGLE_MAX_RADIUS_M = 50000;
/** Grid step in m so 50km-radius circles overlap and cover the screen. */
const GRID_STEP_M = 70000;

/** Max grid size so we stay under Vercel timeout and Google rate limits. */
const MAX_GRID_CELLS = 9;

/** Return grid of (lat, lng) centers that cover the bounds. Capped so the API completes in time. */
function getGridCenters(
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number
): { lat: number; lng: number }[] {
  const centerLat = (swLat + neLat) / 2;
  const latMetersPerDeg = 111320;
  const lngMetersPerDeg = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const heightM = (neLat - swLat) * latMetersPerDeg;
  const widthM = (neLng - swLng) * lngMetersPerDeg;
  let rows = Math.max(1, Math.ceil(heightM / GRID_STEP_M));
  let cols = Math.max(1, Math.ceil(widthM / GRID_STEP_M));
  while (rows * cols > MAX_GRID_CELLS) {
    if (rows > cols) rows = Math.max(1, rows - 1);
    else cols = Math.max(1, cols - 1);
  }
  const centers: { lat: number; lng: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = swLat + ((r + 0.5) / rows) * (neLat - swLat);
      const lng = swLng + ((c + 0.5) / cols) * (neLng - swLng);
      centers.push({ lat, lng });
    }
  }
  return centers;
}
type PlaceType = (typeof PLACE_TYPES)[number];

type LocationItem = {
  id: string;
  name: string;
  type: 'campsite' | 'ev_charger' | 'rest_stop';
  lat: number;
  lng: number;
  description: string;
  address: string;
  facilities: string[];
  images: string[];
  google_place_id?: string;
  ocm_id?: number;
  website?: string;
  phone?: string;
  rating?: number;
  user_ratings_total?: number;
  created_at: string;
  updated_at: string;
};

function toAppType(googleType: string): 'campsite' | 'ev_charger' | 'rest_stop' {
  if (googleType === 'campground') return 'campsite';
  if (googleType === 'electric_vehicle_charging_station') return 'ev_charger';
  return 'rest_stop';
}

function normalizePlace(result: GooglePlaceResult, type: PlaceType): LocationItem | null {
  const loc = result.geometry?.location;
  if (!loc) return null;
  const now = new Date().toISOString();
  return {
    id: result.place_id,
    name: result.name || 'Unnamed',
    type: toAppType(type),
    lat: loc.lat,
    lng: loc.lng,
    description: result.formatted_address || '',
    address: result.formatted_address || '',
    facilities: [],
    images: [],
    google_place_id: result.place_id,
    rating: result.rating,
    user_ratings_total: result.user_ratings_total,
    created_at: now,
    updated_at: now,
  };
}

interface GooglePlaceResult {
  place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
}

interface OCMResult {
  ID: number;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    StateOrProvince?: string;
    Postcode?: string;
    Latitude?: number;
    Longitude?: number;
  };
  OperatorInfo?: { Title?: string; WebsiteURL?: string; PhonePrimaryContact?: string };
  NumberOfPoints?: number;
  UsageCost?: string;
  Connections?: { ConnectionType?: { Title?: string } }[];
}

function formatOcmAddress(r: OCMResult): string {
  const a = r.AddressInfo;
  if (!a) return 'Address not listed';
  const parts = [a.AddressLine1, a.Town, a.StateOrProvince, a.Postcode].filter(Boolean);
  return parts.join(', ') || 'Address not listed';
}

function formatOcmDescription(r: OCMResult): string {
  const conns = (r.Connections?.map((c) => c.ConnectionType?.Title).filter((t): t is string => typeof t === 'string') ?? []).slice(0, 3);
  const points = r.NumberOfPoints != null ? `${r.NumberOfPoints} connector(s)` : '';
  const cost = r.UsageCost ? ` — ${r.UsageCost}` : '';
  return [points, conns.join(', '), cost].filter(Boolean).join(' ') || 'EV charging point';
}

async function fetchOcmInBounds(swLat: number, swLng: number, neLat: number, neLng: number): Promise<LocationItem[]> {
  const bbox = `${swLat},${swLng},${neLat},${neLng}`;
  const areaDeg = (neLat - swLat) * (neLng - swLng);
  const maxresults = areaDeg > 10 ? 300 : areaDeg > 2 ? 200 : 100;
  const url = `${OCM_BASE}?output=json&boundingbox=${bbox}&maxresults=${maxresults}&compact=true&verbose=false`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = (await resp.json()) as OCMResult[];
    if (!Array.isArray(data)) return [];
    const now = new Date().toISOString();
    return data
      .map((r) => {
        const lat = r.AddressInfo?.Latitude ?? (r as OCMResult & { Latitude?: number }).Latitude ?? 0;
        const lng = r.AddressInfo?.Longitude ?? (r as OCMResult & { Longitude?: number }).Longitude ?? 0;
        const name = r.AddressInfo?.Title || r.OperatorInfo?.Title || `Charging point #${r.ID}`;
        const facilities = (r.Connections?.map((c) => c.ConnectionType?.Title).filter((t): t is string => typeof t === 'string') ?? []).slice(0, 6);
        return {
          id: `ocm-${r.ID}`,
          name,
          type: 'ev_charger' as const,
          lat,
          lng,
          description: formatOcmDescription(r),
          address: formatOcmAddress(r),
          facilities,
          images: [],
          website: r.OperatorInfo?.WebsiteURL,
          phone: r.OperatorInfo?.PhonePrimaryContact,
          ocm_id: r.ID,
          created_at: now,
          updated_at: now,
        };
      })
      .filter((loc) => loc.lat !== 0 || loc.lng !== 0);
  } catch (e) {
    console.error('Open Charge Map fetch error:', e);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = req.query || {};
  const swLat = parseFloat(String(q.swLat ?? ''));
  const swLng = parseFloat(String(q.swLng ?? ''));
  const neLat = parseFloat(String(q.neLat ?? ''));
  const neLng = parseFloat(String(q.neLng ?? ''));

  if ([swLat, swLng, neLat, neLng].some(Number.isNaN)) {
    return res.status(400).json({ error: 'Invalid bounds: swLat, swLng, neLat, neLng required' });
  }

  const [cSwLat, cSwLng, cNeLat, cNeLng] = clampBoundsToUK(swLat, swLng, neLat, neLng);
  const byId = new Map<string, LocationItem>();

  // 1) Primary: load from Supabase (UK data synced by cron). If we have data, use it.
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: rows } = await supabase
        .from('locations')
        .select('id, name, type, lat, lng, description, address, price, facilities, images, website, phone, google_place_id, external_id, external_source, created_at, updated_at')
        .gte('lat', cSwLat)
        .lte('lat', cNeLat)
        .gte('lng', cSwLng)
        .lte('lng', cNeLng);
      if (rows && rows.length > 0) {
        const now = new Date().toISOString();
        for (const r of rows as Array<{
          id: string;
          name: string;
          type: string;
          lat: number;
          lng: number;
          description: string;
          address: string;
          facilities: string[];
          images: string[];
          website?: string | null;
          phone?: string | null;
          google_place_id?: string | null;
          external_id: string;
          external_source: string;
          created_at: string;
          updated_at: string;
        }>) {
          if (!inUK(r.lat, r.lng)) continue;
          const id = r.id || `${r.external_source}-${r.external_id}`;
          byId.set(id, {
            id,
            name: r.name ?? '',
            type: r.type === 'ev_charger' ? 'ev_charger' : r.type === 'rest_stop' ? 'rest_stop' : 'campsite',
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
            created_at: r.created_at ?? now,
            updated_at: r.updated_at ?? now,
          });
        }
        const fromDb = Array.from(byId.values());
        fromDb.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ locations: fromDb });
      }
    } catch (e) {
      console.error('Supabase places fetch error:', e);
    }
  }

  // 2) Fallback: live APIs (Google + OCM) for current viewport. UK only.
  const ocmLocations = await fetchOcmInBounds(cSwLat, cSwLng, cNeLat, cNeLng);
  for (const loc of ocmLocations) {
    if (inUK(loc.lat, loc.lng)) byId.set(loc.id, loc);
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key) {
    const gridCenters = getGridCenters(cSwLat, cSwLng, cNeLat, cNeLng);
    for (const type of PLACE_TYPES) {
      for (const { lat: centerLat, lng: centerLng } of gridCenters) {
        const url = new URL(GOOGLE_PLACES_BASE);
        url.searchParams.set('query', type.replace(/_/g, ' '));
        url.searchParams.set('location', `${centerLat},${centerLng}`);
        url.searchParams.set('radius', String(GOOGLE_MAX_RADIUS_M));
        url.searchParams.set('type', type);
        url.searchParams.set('key', key);
        try {
          const resp = await fetch(url.toString());
          const data = (await resp.json()) as { status: string; results?: GooglePlaceResult[] };
          if (data.status === 'OK' && Array.isArray(data.results)) {
            for (const r of data.results) {
              const loc = normalizePlace(r, type);
              if (loc && inUK(loc.lat, loc.lng)) byId.set(loc.id, loc);
            }
          }
        } catch (e) {
          console.error('Google Places fetch error:', e);
        }
      }
    }
  }

  const allLocations = Array.from(byId.values());
  const popularityScore = (loc: LocationItem) => {
    const r = loc.rating ?? 0;
    const n = loc.user_ratings_total ?? 0;
    return r * Math.log10(n + 1);
  };
  allLocations.sort((a, b) => popularityScore(b) - popularityScore(a));
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ locations: allLocations });
}
