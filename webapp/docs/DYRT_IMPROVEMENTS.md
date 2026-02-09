# The Dyrt–Style Improvements

## 1. Map performance – marker clustering (Supercluster)

- **Package:** `supercluster` added to `package.json`. Run `npm install` if you haven’t.
- **Behaviour:** When zoomed out, nearby markers are grouped into clusters with a count (e.g. "47"). Clicking a cluster zooms in to reveal individual markers or smaller clusters. Cluster size/colour differs by count (small: 2–10, medium: 11–50, large: 50+). Only markers/clusters in the current viewport are rendered.
- **Files:** `src/components/map/MapView.tsx` (ClusterLayer, Supercluster index, memoized LocationMarker).

## 2. Location card (LocationSheet)

- **Contact:** Phone (clickable `tel:` on mobile), website (opens in new tab), address (clickable → Google Maps).
- **Opening hours:** Collapsible section; "Open Now" / "Closed" when data is available.
- **Header:** Type badge, rating (stars + review count), distance from user (when `userLocation` is set), price (Free / £ / ££ / £££).
- **Quick info:** Price + facilities as chips.
- **Add to Trip:** Button shown when `onAddToTrip` is passed (foundation for trips feature).
- **Performance:** Review photos use `loading="lazy"`.

## 3. Database schema

- **Migration:** `docs/SCHEMA_MIGRATION.sql`. Run in Supabase → SQL Editor before relying on new fields.
- **Locations:** New columns: `opening_hours` (jsonb), `rating` (numeric), `review_count` (integer), `price_level` (integer). Index: `idx_locations_lat_lng` on `(lat, lng)`.
- **Trips:** New table `trips` (id, user_id, name, description, locations uuid[], created_at, updated_at) with RLS.

## 4. Sync (api/sync-places.ts)

- Google Places rows now include `rating` and `review_count` (from Text Search). `price_level` and `opening_hours` are left null until you add Place Details (extra API calls) if desired.

## 5. API (api/places.ts)

- Select and return `rating`, `review_count`, `price_level`, `opening_hours` for locations so the card can show them.

## 6. Types (src/types/index.ts)

- `Location`: `price_level`, `review_count`, `opening_hours`; `OpeningHours` type for hours.

## What you need to do

1. Run `npm install` (for `supercluster`).
2. Run `docs/SCHEMA_MIGRATION.sql` in Supabase SQL Editor so `locations` has the new columns and `trips` exists.
3. Redeploy; clustering and the new location card fields will work. To show "Add to Trip", wire `onAddToTrip` on `LocationSheet` to your trips logic when ready.
