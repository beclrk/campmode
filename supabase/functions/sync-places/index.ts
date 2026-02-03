/**
 * Forwards sync to the Vercel API route so the real sync (with proxy-only image URLs
 * and Place Details enrichment) runs on Vercel. Set VERCEL_SYNC_URL and CRON_SECRET
 * in Supabase Edge Function secrets. If you prefer to run sync only on Vercel, point
 * your cron at the Vercel URL instead and do not invoke this function.
 */
Deno.serve(async (req: Request) => {
  const url = Deno.env.get('VERCEL_SYNC_URL');
  const secret = Deno.env.get('CRON_SECRET');
  if (!url || !secret) {
    return new Response(
      JSON.stringify({
        error: 'VERCEL_SYNC_URL or CRON_SECRET not set. Point cron at Vercel /api/sync-places instead.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Sync forward failed' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
