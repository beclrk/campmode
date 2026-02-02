type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const OCM_BASE = 'https://api.openchargemap.io/v3/poi/';
const PLACE_TYPES = ['campground', 'rest_stop', 'electric_vehicle_charging_station'] as const;
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
  const url = `${OCM_BASE}?output=json&boundingbox=${bbox}&maxresults=100&compact=true&verbose=false`;
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

  const centerLat = (swLat + neLat) / 2;
  const centerLng = (swLng + neLng) / 2;
  const radiusM = Math.min(50000, Math.round(
    Math.sqrt(Math.pow((neLat - swLat) * 111320, 2) + Math.pow((neLng - swLng) * 111320 * Math.cos((centerLat * Math.PI) / 180), 2)) / 2
  ));

  const byId = new Map<string, LocationItem>();

  // Always fetch Open Charge Map server-side (no CORS) so EV chargers show even without Google key
  const ocmLocations = await fetchOcmInBounds(swLat, swLng, neLat, neLng);
  for (const loc of ocmLocations) byId.set(loc.id, loc);

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key) {
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
            if (loc) byId.set(loc.id, loc);
          }
        }
      } catch (e) {
        console.error('Google Places fetch error:', e);
      }
    }
  }

  const allLocations = Array.from(byId.values());
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ locations: allLocations });
}
