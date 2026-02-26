/**
 * Proxies Google Place Photo so the API key stays server-side.
 * GET /api/place-photo?photo_reference=XXX
 * Returns the image with cache headers.
 */
type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  end: (body?: string) => void;
};

const GOOGLE_PHOTO_BASE = 'https://maps.googleapis.com/maps/api/place/photo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  const ref = typeof req.query?.photo_reference === 'string' ? req.query.photo_reference.trim() : '';
  if (!ref) {
    res.status(400).end();
    return;
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    res.status(503).end();
    return;
  }

  const url = `${GOOGLE_PHOTO_BASE}?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${key}`;
  try {
    const imgRes = await fetch(url, { redirect: 'manual' });
    if (imgRes.status === 302 || imgRes.status === 301) {
      const location = imgRes.headers.get('location');
      if (location) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.setHeader('Location', location);
        res.status(302).end();
        return;
      }
    }
    return res.status(imgRes.status || 502).end();
  } catch (e) {
    console.error('[place-photo]', e);
    return res.status(502).end();
  }
}
