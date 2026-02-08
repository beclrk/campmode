import { createClient } from '@supabase/supabase-js';

type VercelRequest = { method?: string; query?: Record<string, string | string[] | undefined> };
type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

/** GET /api/trip?id=uuid — returns trip name and location ids for share links. No auth required. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = typeof req.query?.id === 'string' ? req.query.id.trim() : '';
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing Supabase config' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: row, error } = await supabase
      .from('trips')
      .select('id, name, locations')
      .eq('id', id)
      .single();

    if (error || !row) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const locations = (row as { locations?: string[] }).locations ?? [];
    const locationIds = Array.isArray(locations) ? locations.filter((x): x is string => typeof x === 'string') : [];

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      id: (row as { id: string }).id,
      name: (row as { name: string }).name ?? '',
      locationIds,
    });
  } catch (e) {
    console.error('Trip API error:', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Internal error' });
  }
}
