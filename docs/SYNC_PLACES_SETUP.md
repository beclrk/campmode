# Automatic places sync (Supabase)

**Sync runs only via the Vercel API route** `GET /api/sync-places`. That route fetches campsites, rest stops, and EV chargers from Google Places and Open Charge Map and upserts them into your Supabase `locations` table.

- **Images are stored only as proxy URLs:** `/api/place-photo?photo_reference=REFERENCE` — never raw Google URLs or API keys.
- If you were using a Supabase Edge Function for sync, point your cron to the Vercel URL instead (or use the forwarding Edge Function in `supabase/functions/sync-places` so the real sync still runs on Vercel).

## 1. Unique constraint (required)

In **Supabase → SQL Editor**, run once:

```sql
ALTER TABLE locations
ADD CONSTRAINT locations_external_unique UNIQUE (external_source, external_id);
```

If the constraint already exists (or you use a different name), skip or adjust.

## 2. Environment variables (Vercel)

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL, e.g. `https://qarbncxrgscupnuhkoih.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Service role** key (Project → Settings → API). Required for server-side upsert. |
| `CRON_SECRET` | A random secret (e.g. `openssl rand -hex 32`). Used to secure the cron endpoint. |
| `GOOGLE_PLACES_API_KEY` | Same key as for the map (optional; without it, only OCM EV chargers are synced). |

Use the same Supabase project (e.g. London `eu-west-2`).

## 3. Cron schedule (split for 60s timeout)

Sync is split into four endpoints so each run stays under Vercel Hobby’s 60s limit:

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `GET /api/sync-places?type=ev_only` | Daily 04:00 UTC | OpenChargeMap EV chargers only (free API). |
| `GET /api/sync-places?type=campsites` | Sunday 04:10 UTC | Google Places Text Search – campsites only. |
| `GET /api/sync-places?type=rest_stops` | Sunday 04:20 UTC | Google Places Text Search – rest stops only. |
| `GET /api/sync-places?type=enrich_photos` | Sunday 04:30 UTC | Place Details photo enrichment for top 10% campsites + rest stops. |

Manual trigger examples:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/sync-places?type=ev_only"
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/sync-places?type=campsites"
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/sync-places?type=rest_stops"
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/sync-places?type=enrich_photos"
```

If you use a Supabase cron, point it at one of these URLs (or use the forwarding Edge Function with `VERCEL_SYNC_URL` set to one of the above and invoke it with the desired `?type=...`).

## 4. Table columns

Sync writes to these columns (others stay unchanged on update):

- `name`, `type`, `lat`, `lng`, `description`, `address`
- `price` (null), `facilities` (array), `images` (array of proxy URLs only: `/api/place-photo?photo_reference=...`)
- `website`, `phone`, `google_place_id`
- `external_id`, `external_source` (`'google'` or `'open_charge_map'`)
- `created_at`, `updated_at`

`type` is one of: `campsite`, `ev_charger`, `rest_stop`.
