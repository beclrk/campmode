# Automatic places sync (Supabase)

The `/api/sync-places` cron job fetches campsites, rest stops, and EV chargers from Google Places and Open Charge Map and upserts them into your Supabase `locations` table.

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

## 3. Cron schedule

The job is defined in `vercel.json` and runs daily. You can trigger it manually:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-app.vercel.app/api/sync-places"
```

## 4. Table columns

Sync writes to these columns (others stay unchanged on update):

- `name`, `type`, `lat`, `lng`, `description`, `address`
- `price` (null), `facilities` (array), `images` (array)
- `website`, `phone`, `google_place_id`
- `external_id`, `external_source` (`'google'` or `'open_charge_map'`)
- `created_at`, `updated_at`

`type` is one of: `campsite`, `ev_charger`, `rest_stop`.
