import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; headers?: Record<string, string | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

/** Allow long-running sync (Vercel Pro: up to 300s; Hobby: 10s). */
export const config = { maxDuration: 300 };

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const OCM_BASE = 'https://api.openchargemap.io/v3/poi/';
const PLACE_TYPES = ['campground', 'rest_stop', 'electric_vehicle_charging_station'] as const;
const GOOGLE_MAX_RADIUS_M = 50000;
const GRID_STEP_M = 70000;
/** Delay (ms) before using next_page_token (Google requirement). */
const GOOGLE_PAGE_DELAY_MS = 1500;

/** UK bounds – fetch ALL locations for entire UK. */
const SYNC_BOUNDS = { swLat: 49.8, swLng: -8.6, neLat: 60.9, neLng: 1.8 };

type ExternalSource = 'google' | 'open_charge_map';

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

interface SupabaseLocationRow {
  name: string;
  type: 'campsite' | 'ev_charger' | 'rest_stop';
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
  external_source: ExternalSource;
  rating?: number | null;
  review_count?: number | null;
  price_level?: number | null;
  opening_hours?: unknown;
  created_at: string;
  updated_at: string;
}

function toAppType(googleType: string): 'campsite' | 'ev_charger' | 'rest_stop' {
  if (googleType === 'campground') return 'campsite';
  if (googleType === 'electric_vehicle_charging_station') return 'ev_charger';
  return 'rest_stop';
}

/** Full UK grid – no cell limit. Covers entire UK for comprehensive sync. */
function getUKGridCenters(): { lat: number; lng: number }[] {
  const { swLat, swLng, neLat, neLng } = SYNC_BOUNDS;
  const centerLat = (swLat + neLat) / 2;
  const latMetersPerDeg = 111320;
  const lngMetersPerDeg = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const heightM = (neLat - swLat) * latMetersPerDeg;
  const widthM = (neLng - swLng) * lngMetersPerDeg;
  const rows = Math.max(1, Math.ceil(heightM / GRID_STEP_M));
  const cols = Math.max(1, Math.ceil(widthM / GRID_STEP_M));
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch ALL UK EV chargers from OpenChargeMap. Single request, no limit (API may cap at ~10k). */
async function fetchAllOcmUK(): Promise<SupabaseLocationRow[]> {
  const { swLat, swLng, neLat, neLng } = SYNC_BOUNDS;
  const bbox = `${swLat},${swLng},${neLat},${neLng}`;
  const url = `${OCM_BASE}?output=json&boundingbox=${bbox}&maxresults=50000&compact=true&verbose=false`;
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
          name,
          type: 'ev_charger' as const,
          lat,
          lng,
          description: formatOcmDescription(r),
          address: formatOcmAddress(r),
          price: null,
          facilities,
          images: [],
          website: r.OperatorInfo?.WebsiteURL ?? null,
          phone: r.OperatorInfo?.PhonePrimaryContact ?? null,
          google_place_id: null,
          external_id: String(r.ID),
          external_source: 'open_charge_map' as const,
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

/** Fetch one page of Google Places (optionally with pagetoken). */
async function fetchGooglePage(
  centerLat: number,
  centerLng: number,
  type: string,
  key: string,
  pageToken?: string
): Promise<{ results: GooglePlaceResult[]; next_page_token?: string }> {
  const url = new URL(GOOGLE_PLACES_BASE);
  if (pageToken) {
    url.searchParams.set('pagetoken', pageToken);
  } else {
    url.searchParams.set('query', type.replace(/_/g, ' '));
    url.searchParams.set('location', `${centerLat},${centerLng}`);
    url.searchParams.set('radius', String(GOOGLE_MAX_RADIUS_M));
    url.searchParams.set('type', type);
    url.searchParams.set('key', key);
  }
  const resp = await fetch(url.toString());
  const data = (await resp.json()) as {
    status: string;
    results?: GooglePlaceResult[];
    next_page_token?: string;
  };
  return {
    results: data.status === 'OK' && Array.isArray(data.results) ? data.results : [],
    next_page_token: data.next_page_token,
  };
}

/** Fetch ALL Google Places for UK: full grid + pagination. */
async function fetchAllGoogleUK(key: string): Promise<SupabaseLocationRow[]> {
  const gridCenters = getUKGridCenters();
  const byId = new Map<string, SupabaseLocationRow>();
  const now = new Date().toISOString();

  for (const type of PLACE_TYPES) {
    for (const { lat: centerLat, lng: centerLng } of gridCenters) {
      let pageToken: string | undefined;
      do {
        const { results, next_page_token } = await fetchGooglePage(
          centerLat,
          centerLng,
          type,
          key,
          pageToken
        );
        for (const r of results) {
          const loc = r.geometry?.location;
          if (!loc) continue;
          const row: SupabaseLocationRow = {
            name: r.name || 'Unnamed',
            type: toAppType(type),
            lat: loc.lat,
            lng: loc.lng,
            description: r.formatted_address || '',
            address: r.formatted_address || '',
            price: null,
            facilities: [],
            images: [],
            website: null,
            phone: null,
            google_place_id: r.place_id,
            external_id: r.place_id,
            external_source: 'google',
            rating: r.rating != null ? Number(r.rating) : null,
            review_count: r.user_ratings_total != null ? Number(r.user_ratings_total) : null,
            price_level: null,
            opening_hours: null,
            created_at: now,
            updated_at: now,
          };
          byId.set(r.place_id, row);
        }
        pageToken = next_page_token ?? undefined;
        if (pageToken) await sleep(GOOGLE_PAGE_DELAY_MS);
      } while (pageToken);
    }
  }
  return Array.from(byId.values());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const ocmRows = await fetchAllOcmUK();
    let googleRows: SupabaseLocationRow[] = [];
    const googleKey = process.env.GOOGLE_PLACES_API_KEY;
    if (googleKey) {
      googleRows = await fetchAllGoogleUK(googleKey);
    }

    const allRows = [...ocmRows, ...googleRows];
    if (allRows.length === 0) {
      return res.status(200).json({ ok: true, upserted: 0, message: 'No places fetched' });
    }

    const { error } = await supabase
      .from('locations')
      .upsert(allRows as Record<string, unknown>[], {
        onConflict: ['external_source', 'external_id'],
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: error.message, code: error.code });
    }

    return res.status(200).json({
      ok: true,
      upserted: allRows.length,
      from_ocm: ocmRows.length,
      from_google: googleRows.length,
    });
  } catch (e) {
    console.error('Sync error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Sync failed' });
  }
}
