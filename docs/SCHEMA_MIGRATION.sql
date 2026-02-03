-- CampMode schema updates: locations (opening_hours, rating, review_count, price_level) and trips table.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor). Project: qarbncxrgscupnuhkoih
-- Run this migration before deploying app changes that use these columns; otherwise /api/places may error.

-- 1. Locations: add columns for The Dyrt-style detail (opening hours, rating, price level)
ALTER TABLE locations ADD COLUMN IF NOT EXISTS opening_hours jsonb;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS rating numeric(2,1);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS price_level integer; -- 0=free, 1=£, 2=££, 3=£££

-- 2. Index for fast map bounds queries (lat/lng)
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng ON locations(lat, lng);

-- 3. Trips table (foundation for "Add to Trip" / Saved Trips)
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  locations uuid[] DEFAULT '{}', -- array of location IDs in order
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional: RLS for trips (only owner can read/write)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own trips" ON trips;
CREATE POLICY "Users can manage own trips" ON trips
  FOR ALL USING (auth.uid() = user_id);
