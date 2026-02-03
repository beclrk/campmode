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

/** Map API: ONLY reads from Supabase. All data is synced by api/sync-places (daily or on-demand). */
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run sync first to populate locations.',
    });
  }

  const PAGE_SIZE = 1000;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const allRows: Record<string, unknown>[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: rows, error } = await supabase
        .from('locations')
        .select('id, name, type, lat, lng, description, address, price, facilities, images, website, phone, google_place_id, external_id, external_source, created_at, updated_at')
        .gte('lat', cSwLat)
        .lte('lat', cNeLat)
        .gte('lng', cSwLng)
        .lte('lng', cNeLng)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('Supabase places query error:', error);
        return res.status(500).json({ error: error.message, code: error.code });
      }

      const page = (rows ?? []) as Record<string, unknown>[];
      allRows.push(...page);
      hasMore = page.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }

    const now = new Date().toISOString();
    const locations = allRows
      .filter((r: { lat: number; lng: number }) => inUK(r.lat, r.lng))
      .map((r: {
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
      }) => ({
        id: r.id || `${r.external_source}-${r.external_id}`,
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
      }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ locations });
  } catch (e) {
    console.error('Places API error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' });
  }
}
