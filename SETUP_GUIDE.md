# CampMode - Setup Guide

This guide will take you from zero to a live app. Follow each step in order.

---

## What You'll Have When Done

- ✅ Live web app at `yourname.vercel.app`
- ✅ User login (Apple ID + Email)
- ✅ Database for users and reviews
- ✅ Ready for mobile app conversion

---

## Step 1: Create a GitHub Account (if you don't have one)

1. Go to **github.com**
2. Click **Sign Up**
3. Use your email and create a password
4. Verify your email

---

## Step 2: Create a Supabase Account & Project

Supabase handles your database AND user authentication (login). One service, two jobs.

### Create Account
1. Go to **supabase.com**
2. Click **Start your project**
3. Sign in with GitHub (use the account from Step 1)

### Create Your Project
1. Click **New Project**
2. Choose a name: `campmode`
3. Create a strong database password (save this somewhere!)
4. Select region: **London** (closest to UK users)
5. Click **Create new project**
6. Wait 2-3 minutes for it to set up

### Get Your API Keys
1. Once ready, go to **Settings** (gear icon, left sidebar)
2. Click **API** in the submenu
3. You'll see two important values:
   - **Project URL** - looks like `https://xxxxx.supabase.co`
   - **anon public** key - a long string starting with `eyJ...`
4. **Copy both of these somewhere safe** - you'll need them soon

---

## Step 3: Set Up Authentication in Supabase

### Enable Email Login
1. In Supabase, go to **Authentication** (left sidebar)
2. Click **Providers**
3. Find **Email** - it should already be enabled
4. Make sure "Confirm email" is ON (for security)

### Enable Apple Login (Optional - requires Apple Developer Account)
1. Still in **Providers**, find **Apple**
2. Click to expand it
3. Toggle it ON

**Note**: Apple Sign In requires an Apple Developer Account (£79/year). You can skip this for now and just use Email login. You'll need the developer account anyway when you publish to the App Store.

---

## Step 4: Create Database Tables

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste this entire block:

```sql
-- Create profiles table (stores user info)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Create locations table (campsites, chargers, rest stops)
create table public.locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('campsite', 'ev_charger', 'rest_stop')),
  lat decimal(10, 7) not null,
  lng decimal(10, 7) not null,
  description text,
  address text,
  price text,
  facilities text[] default '{}',
  images text[] default '{}',
  website text,
  phone text,
  google_place_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create reviews table
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  location_id uuid references public.locations on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  photos text[] default '{}',
  created_at timestamp with time zone default now()
);

-- Create saved_locations table (user favorites)
create table public.saved_locations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  location_id uuid references public.locations on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(user_id, location_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_locations enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Policies for locations
create policy "Anyone can view locations"
  on public.locations for select using (true);

-- Policies for reviews
create policy "Anyone can view reviews"
  on public.reviews for select using (true);

create policy "Logged in users can create reviews"
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update using (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on public.reviews for delete using (auth.uid() = user_id);

-- Policies for saved locations
create policy "Users can view own saved locations"
  on public.saved_locations for select using (auth.uid() = user_id);

create policy "Users can save locations"
  on public.saved_locations for insert with check (auth.uid() = user_id);

create policy "Users can unsave locations"
  on public.saved_locations for delete using (auth.uid() = user_id);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

4. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
5. You should see "Success" message

---

## Step 5: Upload Your Code to GitHub

Your code is already on GitHub at **github.com/beclrk/campmode** (private repo). If you're setting up from scratch:

- **From Cursor:** Ask the AI to "commit and push" or "create GitHub repo campmode" (see **DEPLOY.md** for one-time Git/gh setup).
- **Or** use GitHub Desktop or drag-and-drop on github.com as in the options below.

### Option A: From Cursor (after Git + gh are set up)

1. In Cursor, ask: *"Push to GitHub"* or *"Create the campmode repo and push"*
2. The AI will run `gh repo create campmode --public` (or `--private`) and push

### Option B: Using GitHub Desktop

1. Download **GitHub Desktop** from desktop.github.com
2. Sign in with your GitHub account
3. **Add** → **Add Existing Repository** → choose your CampMode-v2 folder (if you already ran `git init`), or **New Repository** named `campmode`
4. Commit and **Publish repository** (or **Push origin**)

### Option C: Create repo on GitHub, then push from terminal/Cursor

1. Go to **github.com/new** → name: `campmode` → Create (don’t add README)
2. Tell the AI your GitHub username and ask it to add the remote and push

---

## Step 6: Deploy to Vercel

1. Go to **vercel.com**
2. Click **Sign Up** → **Continue with GitHub**
3. Click **Add New** → **Project**
4. Find `campmode` and click **Import**

### Add Environment Variables (Important!)

Before clicking Deploy, expand **Environment Variables** and add these two (you can copy the values from **.env.example** in this project):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL (from Step 2) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (from Step 2) |

5. Click **Deploy**
6. Wait 1-2 minutes

🎉 **Your app is now live!** Vercel gives you a URL like `campmode-abc123.vercel.app`

---

## Step 7: Configure Supabase Redirect URLs

Your login won't work yet - Supabase needs to know your website address.

1. Go to **Supabase** → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g., `https://campmode-abc123.vercel.app`)
3. Add these **Redirect URLs**:
   - `https://campmode-abc123.vercel.app`
   - `https://campmode-abc123.vercel.app/**`
   - `http://localhost:5173` (for testing locally later)
4. Click **Save**

---

## Step 8: Test Your App!

1. Visit your Vercel URL
2. You should see the login screen
3. Enter your email
4. Check your inbox (and spam folder) for the magic link
5. Click the link
6. You're in! 🎉

---

## Step 9: Add Your First Locations

1. Go to **Supabase** → **Table Editor**
2. Click **locations**
3. Click **Insert** → **Insert Row**
4. Fill in a campsite:

| Field | Example Value |
|-------|---------------|
| name | Peak District Camping |
| type | campsite |
| lat | 53.3498 |
| lng | -1.7802 |
| description | Scenic campsite in the heart of the Peak District... |
| address | Fieldhead, Edale, Hope Valley S33 7ZA |
| price | £25/night |
| facilities | {"Electric Hookup", "Showers", "Toilets", "Shop"} |
| website | https://example.com |

5. Click **Save**

The location will appear on your map immediately!

---

## Troubleshooting

### "Invalid API key" error
- Check your environment variables in Vercel (Settings → Environment Variables)
- Make sure there are no extra spaces before/after the values
- Redeploy after fixing (Deployments → ... → Redeploy)

### Login email not arriving
- Check your spam/junk folder
- In Supabase → Authentication → Email Templates, check the sender settings

### Map not showing
- Make sure you have locations in your database
- Check browser console for errors (Right-click → Inspect → Console)

### Changes not appearing
- Vercel auto-deploys when you push to GitHub
- Or manually redeploy: Vercel → Deployments → Redeploy

---

## Real-world map data (optional)

The map can show **real campsites, rest stops, and EV chargers** from Google Places and Open Charge Map.

- **Open Charge Map** (EV chargers) works without a key; data loads when you pan/zoom the map.
- **Google Places** (campsites, rest stops, and EV chargers from Google) needs an API key:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Enable **Places API**.
  2. Create an API key (Credentials → Create credentials → API key).
  3. In **Vercel** → your project → Settings → Environment Variables, add:
     - Name: `GOOGLE_PLACES_API_KEY`
     - Value: your API key
  4. Redeploy. The `/api/places` serverless function will then return real data for the visible map area.

Without a Google key, the app uses sample data. For local development with real data, run `vercel dev` so the API route is available.

---

## Next Steps

Once your app is working:

1. **Add more locations** - Or use real-world data (see above) for campsites, EV chargers, and rest stops

2. **Custom domain** - In Vercel, you can add your own domain like `campmode.co.uk`

3. **Mobile apps** - When ready, I can help you set up Capacitor to create iOS/Android apps from this same code

---

## Questions?

Come back and ask me anytime! I can help with:
- Adding new features
- Fixing issues
- Setting up the mobile apps
- Connecting to real EV charger APIs
- Anything else!
