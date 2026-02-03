# Real-world map data: API key setup

To show **campsites, rest stops, EV charging points** from Google and **links to Google Reviews**, you need **one API key** in **one place**.

---

## 1. What you need

| What you want | Source | API key? |
|---------------|--------|----------|
| Campsites | Google Places | **Yes** (see below) |
| Rest stops | Google Places | **Yes** (same key) |
| EV charging points | Google Places + Open Charge Map | Google: **Yes**. Open Charge Map: **No** |
| Links to Google Reviews | Google Place ID (from Google Places) | **Yes** (same key) |

**So you only need one key: a Google Places API key.**

---

## 2. Get the Google Places API key

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)** and sign in.
2. Create or select a **project** (top bar: project name → New Project or select existing).
3. **Enable the Places API**
   - Left menu: **APIs & Services** → **Library** (or go to [APIs Library](https://console.cloud.google.com/apis/library)).
   - Search for **“Places API”** (the one that says “Places API”, not “Places API (New)”).
   - Open it and click **Enable**.
4. **Create an API key**
   - Left menu: **APIs & Services** → **Credentials** (or [Credentials](https://console.cloud.google.com/apis/credentials)).
   - Click **+ Create Credentials** → **API key**.
   - Copy the key (you can restrict it later: edit the key → restrict to “Places API” and optionally to your Vercel domain).

---

## 3. Where to put it (Vercel)

1. Open **[Vercel](https://vercel.com)** → your **CampMode project**.
2. Go to **Settings** → **Environment Variables**.
3. Add a variable:
   - **Name (key):** `GOOGLE_PLACES_API_KEY`  
     (must be exactly this; the app reads this name.)
   - **Value:** paste your Google API key.
   - **Environment:** tick **Production** (and **Preview** if you want real data on preview deploys).
4. Click **Save**.

---

## 4. Redeploy

Environment variables are applied on the **next deployment**.

- Either push a new commit to your repo (Vercel will redeploy), or  
- In Vercel: **Deployments** → open the **⋯** on the latest deployment → **Redeploy**.

---

## 5. Check it works

1. Open your deployed app (e.g. `https://your-project.vercel.app`).
2. Open the map and **pan/zoom** (e.g. over the UK).
3. After a short delay you should see:
   - **Campsites** and **rest stops** (from Google).
   - **EV charging points** (from Google and Open Charge Map).
4. Tap a **Google-sourced** place → open the card → **“View Google Reviews”** opens Google Maps with that place and its reviews.

**If you still see only sample data:**

- Confirm the env var name in Vercel is exactly **`GOOGLE_PLACES_API_KEY`** (no typo, no extra space).
- Confirm you **redeployed** after adding it.
- In the browser: **Developer tools** (F12) → **Network** → filter by “places”. When you move the map you should see a request to `/api/places?swLat=...`. Open it and check the **Response**: it should contain a `locations` array (can be large). If the response is `{ locations: [] }`, the key may be missing or invalid on the server.

---

## Summary

- **One key:** Google Places API key.
- **One place:** Vercel → Project → **Settings** → **Environment Variables** → add **`GOOGLE_PLACES_API_KEY`** with the key value.
- **Then:** Redeploy. After that you get real campsites, rest stops, EV charging points, and links to Google Reviews for Google-sourced places.
