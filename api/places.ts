type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PLACE_TYPES = ['campground', 'rest_stop', 'electric_vehicle_charging_station'] as const;
type PlaceType = (typeof PLACE_TYPES)[number];

function toAppType(googleType: string): 'campsite' | 'ev_charger' | 'rest_stop' {
  if (googleType === 'campground') return 'campsite';
  if (googleType === 'electric_vehicle_charging_station') return 'ev_charger';
  return 'rest_stop';
}

function normalizePlace(result: GooglePlaceResult, type: PlaceType) {
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
    created_at: now,
    updated_at: now,
  };
}

interface GooglePlaceResult {
  place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return res.status(200).json({ locations: [], source: 'no_key' });
  }

  const q = req.query || {};
  const swLat = parseFloat(String(q.swLat ?? ''));
  const swLng = parseFloat(String(q.swLng ?? ''));
  const neLat = parseFloat(String(q.neLat ?? ''));
  const neLng = parseFloat(String(q.neLng ?? ''));

  if ([swLat, swLng, neLat, neLng].some(Number.isNaN)) {
    return res.status(400).json({ error: 'Invalid bounds: swLat, swLng, neLat, neLng required' });
  }

  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;
  const radiusM = Math.min(50000, Math.round(
    Math.sqrt(Math.pow((neLat - swLat) * 111320, 2) + Math.pow((neLng - swLng) * 111320 * Math.cos((centerLat * Math.PI) / 180), 2)) / 2
  ));

  const allLocations: ReturnType<typeof normalizePlace>[] = [];

  for (const type of PLACE_TYPES) {
    const url = new URL(GOOGLE_PLACES_BASE);
    url.searchParams.set('query', type.replace(/_/g, ' '));
    url.searchParams.set('location', `${centerLat},${centerLng}`);
    url.searchParams.set('radius', String(radiusM));
    url.searchParams.set('type', type);
    url.searchParams.set('key', key);

    try {
      const resp = await fetch(url.toString());
      const data = (await resp.json()) as {
        status: string;
        results?: GooglePlaceResult[];
        error_message?: string;
      };
      if (data.status === 'OK' && Array.isArray(data.results)) {
        for (const r of data.results) {
          const loc = normalizePlace(r, type);
          if (loc) allLocations.push(loc);
        }
      }
    } catch (e) {
      console.error('Google Places fetch error:', e);
    }
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ locations: allLocations });
}
