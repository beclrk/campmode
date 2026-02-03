import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; headers?: Record<string, string | undefined>; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  end: (body?: string) => void;
};

/** Vercel Hobby: 60s. Each sync type must complete within this. */
export const config = { maxDuration: 60 };

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const GOOGLE_PLACE_DETAILS_BASE = 'https://maps.googleapis.com/maps/api/place/details/json';
/** Images are always stored as /api/place-photo?photo_reference=REFERENCE — never raw Google URLs or API keys. */
const OCM_BASE = 'https://api.openchargemap.io/v3/poi/';
const PLACE_DETAILS_DELAY_MS = 100;
const PLACE_TYPES = ['campground', 'rest_stop', 'electric_vehicle_charging_station'] as const;
const GOOGLE_MAX_RADIUS_M = 50000;
const GRID_STEP_M = 70000;
/** Delay (ms) before using next_page_token (Google requirement). */
const GOOGLE_PAGE_DELAY_MS = 1500;

/** COST CONTROL: Without these caps, one full UK sync can make 1500–3000+ Google requests (~£50–100+ per run). */
const MAX_GRID_CELLS = 24;
const MAX_PAGES_PER_CELL_TYPE = 2;
const MAX_GOOGLE_REQUESTS_PER_SYNC = 400;
/** Per-type run (campsites / rest_stops) cap so we finish within 60s. */
const MAX_GOOGLE_REQUESTS_PER_TYPE = 40;
/** Max Place Details calls per enrich_photos run to stay under 60s (~200 * 0.3s). */
const MAX_PLACE_DETAILS_PER_ENRICH_RUN = 200;

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
  photos?: Array<{ photo_reference?: string }>;
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

/** UK grid with cap to limit Google API requests (cost control). */
function getUKGridCenters(): { lat: number; lng: number }[] {
  const { swLat, swLng, neLat, neLng } = SYNC_BOUNDS;
  const centerLat = (swLat + neLat) / 2;
  const latMetersPerDeg = 111320;
  const lngMetersPerDeg = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const heightM = (neLat - swLat) * latMetersPerDeg;
  const widthM = (neLng - swLng) * lngMetersPerDeg;
  let rows = Math.max(1, Math.ceil(heightM / GRID_STEP_M));
  let cols = Math.max(1, Math.ceil(widthM / GRID_STEP_M));
  let total = rows * cols;
  if (total > MAX_GRID_CELLS) {
    const scale = Math.sqrt(MAX_GRID_CELLS / total);
    rows = Math.max(1, Math.round(rows * scale));
    cols = Math.max(1, Math.round(cols * scale));
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

/** Fetch UK EV chargers from OpenChargeMap using countrycode=GB (was boundingbox; OCM returns ~10k with countrycode). */
async function fetchAllOcmUK(): Promise<SupabaseLocationRow[]> {
  const url = `${OCM_BASE}?output=json&countrycode=GB&maxresults=10000&compact=true&verbose=false`;
  try {
    const resp = await fetch(url);
    console.log('[sync-places] OCM API response status:', resp.status, resp.statusText);
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[sync-places] OCM API error body:', text.slice(0, 500));
      return [];
    }
    const data = (await resp.json()) as OCMResult[] | { error?: string; message?: string };
    if (!Array.isArray(data)) {
      console.error('[sync-places] OCM API did not return array:', typeof data, JSON.stringify(data).slice(0, 300));
      return [];
    }
    console.log('[sync-places] OCM API returned', data.length, 'POIs');
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
    console.error('[sync-places] OpenChargeMap fetch error:', e instanceof Error ? e.message : e);
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

/** Build a single Supabase row from a Google Text Search result. Images are proxy URLs only. */
function googleResultToRow(r: GooglePlaceResult, googleType: (typeof PLACE_TYPES)[number], now: string): SupabaseLocationRow | null {
  const loc = r.geometry?.location;
  if (!loc) return null;
  const photoRefs = (r.photos ?? [])
    .map((p) => p.photo_reference)
    .filter((ref): ref is string => Boolean(ref))
    .slice(0, 5);
  const images = photoRefs.map(
    (ref) => `/api/place-photo?photo_reference=${encodeURIComponent(ref)}`
  );
  return {
    name: r.name || 'Unnamed',
    type: toAppType(googleType),
    lat: loc.lat,
    lng: loc.lng,
    description: r.formatted_address || '',
    address: r.formatted_address || '',
    price: null,
    facilities: [],
    images,
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
}

/** Fetch Google Places for UK with hard caps (kept for reference; split sync uses fetchGoogleUKByType). */
async function _fetchAllGoogleUK(key: string): Promise<{ rows: SupabaseLocationRow[]; requestCount: number; capReached: boolean }> {
  const gridCenters = getUKGridCenters();
  const byId = new Map<string, SupabaseLocationRow>();
  const now = new Date().toISOString();
  let requestCount = 0;
  let capReached = false;

  for (const type of PLACE_TYPES) {
    if (capReached) break;
    for (const { lat: centerLat, lng: centerLng } of gridCenters) {
      if (requestCount >= MAX_GOOGLE_REQUESTS_PER_SYNC) {
        capReached = true;
        break;
      }
      let pageToken: string | undefined;
      let pagesThisCell = 0;
      do {
        if (requestCount >= MAX_GOOGLE_REQUESTS_PER_SYNC) {
          capReached = true;
          break;
        }
        if (pagesThisCell >= MAX_PAGES_PER_CELL_TYPE) break;
        const { results, next_page_token } = await fetchGooglePage(
          centerLat,
          centerLng,
          type,
          key,
          pageToken
        );
        requestCount++;
        pagesThisCell++;
        for (const r of results) {
          const row = googleResultToRow(r, type, now);
          if (row) byId.set(r.place_id, row);
        }
        pageToken = next_page_token ?? undefined;
        if (pageToken) await sleep(GOOGLE_PAGE_DELAY_MS);
      } while (pageToken);
    }
  }
  if (capReached) {
    console.warn(`[sync-places] Google request cap reached (${MAX_GOOGLE_REQUESTS_PER_SYNC}). Increase MAX_GOOGLE_REQUESTS_PER_SYNC or run sync less often to control cost.`);
  }
  return { rows: Array.from(byId.values()), requestCount, capReached };
}

/** Fetch one place type only (campground or rest_stop) for UK; cap requests to finish within 60s. */
async function fetchGoogleUKByType(
  key: string,
  googleType: 'campground' | 'rest_stop'
): Promise<{ rows: SupabaseLocationRow[]; requestCount: number; capReached: boolean }> {
  const gridCenters = getUKGridCenters();
  const byId = new Map<string, SupabaseLocationRow>();
  const now = new Date().toISOString();
  let requestCount = 0;
  let capReached = false;

  for (const { lat: centerLat, lng: centerLng } of gridCenters) {
    if (requestCount >= MAX_GOOGLE_REQUESTS_PER_TYPE) {
      capReached = true;
      break;
    }
    let pageToken: string | undefined;
    let pagesThisCell = 0;
    do {
      if (requestCount >= MAX_GOOGLE_REQUESTS_PER_TYPE) {
        capReached = true;
        break;
      }
      if (pagesThisCell >= MAX_PAGES_PER_CELL_TYPE) break;
      const { results, next_page_token } = await fetchGooglePage(
        centerLat,
        centerLng,
        googleType,
        key,
        pageToken
      );
      requestCount++;
      pagesThisCell++;
      for (const r of results) {
        const row = googleResultToRow(r, googleType, now);
        if (row) byId.set(r.place_id, row);
      }
      pageToken = next_page_token ?? undefined;
      if (pageToken) await sleep(GOOGLE_PAGE_DELAY_MS);
    } while (pageToken);
  }
  if (capReached) {
    console.warn(`[sync-places] Per-type request cap reached (${MAX_GOOGLE_REQUESTS_PER_TYPE}).`);
  }
  return { rows: Array.from(byId.values()), requestCount, capReached };
}

/** Fetch Place Details to get up to 5 photo_references for a place. Legacy API returns photo_reference; never expose raw Google URLs. */
async function fetchPlaceDetailsPhotos(placeId: string, key: string): Promise<string[]> {
  const url = `${GOOGLE_PLACE_DETAILS_BASE}?place_id=${encodeURIComponent(placeId)}&key=${key}&fields=photos`;
  const resp = await fetch(url);
  const data = (await resp.json()) as {
    status: string;
    result?: { photos?: Array<{ photo_reference?: string; name?: string }> };
  };
  if (data.status !== 'OK' || !data.result?.photos) {
    if (data.status !== 'OK') {
      console.warn('[sync-places] Place Details non-OK:', data.status, 'place_id:', placeId.slice(0, 20) + '...');
    }
    return [];
  }
  const photos = data.result.photos;
  const refs = photos
    .map((p) => p.photo_reference)
    .filter((ref): ref is string => Boolean(ref))
    .slice(0, 5);
  if (refs.length === 0 && photos.length > 0) {
    console.warn('[sync-places] Place Details photos had no photo_reference (first photo keys):', Object.keys(photos[0] || {}));
  }
  return refs;
}

/**
 * Enrich top 10% highest-rated campsites and rest stops with Place Details photos (in-memory rows).
 * Kept for reference; split sync uses runEnrichPhotosFromSupabase.
 */
async function _enrichGoogleRowsWithPhotos(rows: SupabaseLocationRow[], key: string): Promise<void> {
  const hasPlaceId = (r: SupabaseLocationRow) => Boolean(r.google_place_id);
  const byRating = (a: SupabaseLocationRow, b: SupabaseLocationRow) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    const ca = a.review_count ?? 0;
    const cb = b.review_count ?? 0;
    return cb - ca;
  };

  const campsites = rows.filter((r) => r.type === 'campsite' && hasPlaceId(r)).sort(byRating);
  const restStops = rows.filter((r) => r.type === 'rest_stop' && hasPlaceId(r)).sort(byRating);

  const top10Campsites = campsites.slice(0, Math.max(1, Math.ceil(campsites.length * 0.1)));
  const top10RestStops = restStops.slice(0, Math.max(1, Math.ceil(restStops.length * 0.1)));
  const toEnrich = [...top10Campsites, ...top10RestStops];

  console.log('[sync-places] Photo enrichment: places to enrich', toEnrich.length, '(campsites:', top10Campsites.length, ', rest_stops:', top10RestStops.length, ')');

  let refsReturnedCounts: number[] = [];
  for (let i = 0; i < toEnrich.length; i++) {
    const row = toEnrich[i];
    const placeId = row.google_place_id!;
    await sleep(i === 0 ? 0 : PLACE_DETAILS_DELAY_MS);
    const refs = await fetchPlaceDetailsPhotos(placeId, key);
    refsReturnedCounts.push(refs.length);
    if (refs.length > 0) {
      row.images = refs.map(
        (ref) => `/api/place-photo?photo_reference=${encodeURIComponent(ref)}`
      );
    }
  }

  if (toEnrich.length > 0) {
    const withMultiple = toEnrich.filter((r) => r.images.length > 1).length;
    const sample = toEnrich.slice(0, 5).map((r) => ({ name: r.name?.slice(0, 30), imagesLength: r.images.length }));
    console.log('[sync-places] Place Details refs per place (min/median/max):', Math.min(...refsReturnedCounts), '/', refsReturnedCounts[Math.floor(refsReturnedCounts.length / 2)], '/', Math.max(...refsReturnedCounts));
    console.log('[sync-places] Enriched rows with >1 image:', withMultiple, 'of', toEnrich.length);
    console.log('[sync-places] Sample final row.images lengths:', sample);
  }
}

/** Row shape returned by Supabase locations table (snake_case). */
type SupabaseLocationDbRow = SupabaseLocationRow;

/**
 * Enrich top 10% campsites + rest stops from DB with Place Details photos; cap per run to stay under 60s.
 * Reads from Supabase, fetches Place Details, upserts only enriched rows. Images stored as proxy URLs only.
 */
async function runEnrichPhotosFromSupabase(
  supabase: ReturnType<typeof createClient>,
  key: string
): Promise<{ enriched: number }> {
  const { data: rows, error: selectError } = await supabase
    .from('locations')
    .select('*')
    .in('type', ['campsite', 'rest_stop'])
    .not('google_place_id', 'is', null);

  if (selectError) {
    console.error('[sync-places] Enrich select error:', selectError);
    throw selectError;
  }
  const list = (rows ?? []) as SupabaseLocationDbRow[];
  if (list.length === 0) {
    console.log('[sync-places] Enrich: no campsites/rest_stops with google_place_id in DB.');
    return { enriched: 0 };
  }

  const byRating = (a: SupabaseLocationDbRow, b: SupabaseLocationDbRow) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    const ca = a.review_count ?? 0;
    const cb = b.review_count ?? 0;
    return cb - ca;
  };
  const campsites = list.filter((r) => r.type === 'campsite').sort(byRating);
  const restStops = list.filter((r) => r.type === 'rest_stop').sort(byRating);
  const top10Campsites = campsites.slice(0, Math.max(1, Math.ceil(campsites.length * 0.1)));
  const top10RestStops = restStops.slice(0, Math.max(1, Math.ceil(restStops.length * 0.1)));
  const toEnrich = [...top10Campsites, ...top10RestStops].slice(0, MAX_PLACE_DETAILS_PER_ENRICH_RUN);

  console.log('[sync-places] Enrich: places to enrich', toEnrich.length, '(capped at', MAX_PLACE_DETAILS_PER_ENRICH_RUN, ')');

  const now = new Date().toISOString();
  for (let i = 0; i < toEnrich.length; i++) {
    const row = toEnrich[i];
    const placeId = row.google_place_id!;
    await sleep(i === 0 ? 0 : PLACE_DETAILS_DELAY_MS);
    const refs = await fetchPlaceDetailsPhotos(placeId, key);
    if (refs.length > 0) {
      row.images = refs.map(
        (ref) => `/api/place-photo?photo_reference=${encodeURIComponent(ref)}`
      );
    }
    row.updated_at = now;
  }

  if (toEnrich.length === 0) return { enriched: 0 };
  const { error: upsertError } = await supabase
    .from('locations')
    .upsert(toEnrich as unknown as Record<string, unknown>[], {
      onConflict: ['external_source', 'external_id'],
    });
  if (upsertError) {
    console.error('[sync-places] Enrich upsert error:', upsertError);
    throw upsertError;
  }
  return { enriched: toEnrich.length };
}

const SYNC_TYPES = ['ev_only', 'campsites', 'rest_stops', 'enrich_photos'] as const;
type SyncType = (typeof SYNC_TYPES)[number];

function getSyncType(query: Record<string, string | string[] | undefined> | undefined): SyncType | null {
  const t = query?.type;
  const type = typeof t === 'string' ? t : Array.isArray(t) ? t[0] : undefined;
  if (type && SYNC_TYPES.includes(type as SyncType)) return type as SyncType;
  return null;
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

  const syncType = getSyncType(req.query);
  if (!syncType) {
    return res.status(400).json({
      error: 'Missing or invalid type. Use ?type=ev_only | campsites | rest_stops | enrich_photos',
    });
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
    if (syncType === 'ev_only') {
      const ocmRows = await fetchAllOcmUK();
      if (ocmRows.length === 0) {
        return res.status(200).json({ ok: true, type: 'ev_only', upserted: 0, message: 'No EV chargers fetched' });
      }
      const { error } = await supabase
        .from('locations')
        .upsert(ocmRows as unknown as Record<string, unknown>[], {
          onConflict: ['external_source', 'external_id'],
        });
      if (error) {
        console.error('Supabase upsert error:', error);
        return res.status(500).json({ error: error.message, code: error.code });
      }
      return res.status(200).json({ ok: true, type: 'ev_only', upserted: ocmRows.length });
    }

    if (syncType === 'campsites') {
      const googleKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!googleKey || process.env.GOOGLE_PLACES_SYNC_ENABLED === 'false') {
        return res.status(200).json({ ok: true, type: 'campsites', upserted: 0, message: 'Google sync disabled' });
      }
      const result = await fetchGoogleUKByType(googleKey, 'campground');
      if (result.rows.length === 0) {
        return res.status(200).json({ ok: true, type: 'campsites', upserted: 0, google_requests_used: result.requestCount });
      }
      const { error } = await supabase
        .from('locations')
        .upsert(result.rows as unknown as Record<string, unknown>[], {
          onConflict: ['external_source', 'external_id'],
        });
      if (error) {
        console.error('Supabase upsert error:', error);
        return res.status(500).json({ error: error.message, code: error.code });
      }
      return res.status(200).json({
        ok: true,
        type: 'campsites',
        upserted: result.rows.length,
        google_requests_used: result.requestCount,
        cap_reached: result.capReached,
      });
    }

    if (syncType === 'rest_stops') {
      const googleKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!googleKey || process.env.GOOGLE_PLACES_SYNC_ENABLED === 'false') {
        return res.status(200).json({ ok: true, type: 'rest_stops', upserted: 0, message: 'Google sync disabled' });
      }
      const result = await fetchGoogleUKByType(googleKey, 'rest_stop');
      if (result.rows.length === 0) {
        return res.status(200).json({ ok: true, type: 'rest_stops', upserted: 0, google_requests_used: result.requestCount });
      }
      const { error } = await supabase
        .from('locations')
        .upsert(result.rows as unknown as Record<string, unknown>[], {
          onConflict: ['external_source', 'external_id'],
        });
      if (error) {
        console.error('Supabase upsert error:', error);
        return res.status(500).json({ error: error.message, code: error.code });
      }
      return res.status(200).json({
        ok: true,
        type: 'rest_stops',
        upserted: result.rows.length,
        google_requests_used: result.requestCount,
        cap_reached: result.capReached,
      });
    }

    if (syncType === 'enrich_photos') {
      const googleKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!googleKey) {
        return res.status(200).json({ ok: true, type: 'enrich_photos', enriched: 0, message: 'No Google API key' });
      }
      const { enriched } = await runEnrichPhotosFromSupabase(supabase, googleKey);
      return res.status(200).json({ ok: true, type: 'enrich_photos', enriched });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (e) {
    console.error('Sync error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Sync failed' });
  }
}
