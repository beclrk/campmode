import { Location } from '@/types';

export interface Bounds {
  sw: [number, number];
  ne: [number, number];
}

/** Fetch campsites, rest stops, and EV chargers from our API (Google Places proxy) */
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

/** Open Charge Map POI shape (subset we use) */
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
  const conns = r.Connections?.map((c) => c.ConnectionType?.Title).filter(Boolean) || [];
  const points = r.NumberOfPoints != null ? `${r.NumberOfPoints} connector(s)` : '';
  const cost = r.UsageCost ? ` — ${r.UsageCost}` : '';
  return [points, conns.slice(0, 3).join(', '), cost].filter(Boolean).join(' ') || 'EV charging point';
}

/** Fetch EV charging points from Open Charge Map (no API key required for basic use) */
export async function fetchEvChargersInBounds(bounds: Bounds): Promise<Location[]> {
  const [minLat, minLng] = bounds.sw;
  const [maxLat, maxLng] = bounds.ne;
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  const url = `https://api.openchargemap.io/v3/poi/?output=json&boundingbox=${bbox}&maxresults=100&compact=true&verbose=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as OCMResult[];
    if (!Array.isArray(data)) return [];
    const now = new Date().toISOString();
    return data.map((r) => {
      const raw = r as OCMResult & { Latitude?: number; Longitude?: number };
      const lat = r.AddressInfo?.Latitude ?? raw.Latitude ?? 0;
      const lng = r.AddressInfo?.Longitude ?? raw.Longitude ?? 0;
      const name = r.AddressInfo?.Title || r.OperatorInfo?.Title || `Charging point #${r.ID}`;
      return {
        id: `ocm-${r.ID}`,
        name,
        type: 'ev_charger' as const,
        lat,
        lng,
        description: formatOcmDescription(r),
        address: formatOcmAddress(r),
        facilities: (r.Connections?.map((c) => c.ConnectionType?.Title).filter((t): t is string => typeof t === 'string') ?? []).slice(0, 6),
        images: [],
        website: r.OperatorInfo?.WebsiteURL,
        phone: r.OperatorInfo?.PhonePrimaryContact,
        ocm_id: r.ID,
        created_at: now,
        updated_at: now,
      } satisfies Location;
    });
  } catch {
    return [];
  }
}

/** Fetch all place types in bounds: Google (campsites, rest stops, EV) + Open Charge Map (EV). EV from OCM only if we want to avoid duplicates; we merge and prefer Google when same area. */
export async function fetchAllPlacesInBounds(bounds: Bounds): Promise<Location[]> {
  const [googlePlaces, ocmEv] = await Promise.all([
    fetchGooglePlacesInBounds(bounds),
    fetchEvChargersInBounds(bounds),
  ]);

  const byId = new Map<string, Location>();
  for (const loc of googlePlaces) {
    byId.set(loc.id, loc);
  }
  for (const loc of ocmEv) {
    if (!byId.has(loc.id)) byId.set(loc.id, loc);
  }
  return Array.from(byId.values());
}
