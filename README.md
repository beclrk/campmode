# CampMode

**Live:** [campmode.vercel.app](https://campmode.vercel.app/)

An interactive map for finding campsites, EV chargers, and rest stops across the UK.

## How it was built

The web app is a **React + TypeScript** SPA scaffolded with **Vite** and styled with **Tailwind CSS**. The map runs on **Leaflet** (via react-leaflet) with marker clustering powered by **Supercluster**. A native **iOS** companion app is built in SwiftUI and talks to the same backend.

### Data & APIs

| Source | What it provides |
|---|---|
| **Google Places API** | Campsites and rest stops (text search + place details for photos) |
| **OpenChargeMap API** | EV charging points across the UK |
| **Ordnance Survey Maps API** | Optional OS Road / Outdoor / Light basemap layers |

Location data was synced into a **Supabase** (Postgres) database via scheduled Vercel cron jobs. The crons have since been disabled and the app now runs on a frozen dataset served directly from Supabase.

### Infrastructure

- **Frontend hosting & serverless functions** — Vercel
- **Database & auth** — Supabase (Postgres, Row Level Security, Auth)
- **Image proxy** — A Vercel serverless function proxies Google Place Photos so the API key stays server-side

### Key features

- Clustered map with campsite, EV charger, and rest stop markers
- Quality badges (top 10 % star, 5+ photos crown)
- Filter by location type
- Route planner with polyline overlay
- Save places and plan trips (authenticated users)
- "Get the app" smart banner for the native iOS version
