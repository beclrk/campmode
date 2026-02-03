# Google Places API – Cost Control

## Where Google is used

- **Map (users panning/zooming):** Does **not** call Google. It only calls `/api/places`, which reads from **Supabase**.
- **Sync (`api/sync-places`):** This is the **only** code that calls the Google Places API (Text Search). It runs on a schedule (e.g. daily cron) or when triggered manually.

So high cost comes from **sync**, not from normal map usage.

## Why it can get expensive

One full UK sync used to:

- Build a grid of **~100–180 cells** over the UK.
- For each cell × 3 place types (campground, rest_stop, electric_vehicle_charging_station), call Text Search and **paginate until no more results** (often 3–10+ pages per cell/type).
- **Total:** 1,500–3,000+ Google requests per sync. At typical Text Search pricing (~£0.02–0.03 per request), one sync can be **£30–100+**. If sync runs several times in a day (cron + manual triggers), the bill can reach **£200+** in a day.

## Safeguards added in code

1. **MAX_GRID_CELLS = 24** – Grid is capped so we don’t use 100+ cells.
2. **MAX_PAGES_PER_CELL_TYPE = 2** – At most 2 pages per (cell, type), then move on.
3. **MAX_GOOGLE_REQUESTS_PER_SYNC = 400** – Hard stop: no more than 400 Google requests per sync. One sync stays in the **~£10–15** range (depending on pricing).
4. **GOOGLE_PLACES_SYNC_ENABLED** – In Vercel (or env), set `GOOGLE_PLACES_SYNC_ENABLED=false` to **turn off Google in sync completely**. Sync will still run and fill Supabase from **OpenChargeMap only** (EV chargers), so you get no Google cost.

Sync response now includes `google_requests_used` so you can see how many requests each run used.

## Recommended settings

- **Cron:** Run sync at most **once per day** (e.g. `0 4 * * *` at 04:00 UTC). Do not run it every hour.
- **Manual triggers:** Trigger sync only when you need a full refresh; avoid scripts or tools that call it repeatedly.
- **Protect the endpoint:** Keep `CRON_SECRET` set and only call sync with `Authorization: Bearer <CRON_SECRET>` so random traffic or bots can’t trigger it.
- **To stop Google cost entirely:** Set `GOOGLE_PLACES_SYNC_ENABLED=false` in Vercel. The map will still show all data already in Supabase; new syncs will only add/update OCM (EV) data.

## Checking usage

- **Google Cloud Console:** Billing → Reports, filter by “Places API” / “Text Search” to see request volume and cost.
- **Vercel:** Function logs for `/api/sync-places` show `google_requests_used` in the JSON response when you trigger the sync.
