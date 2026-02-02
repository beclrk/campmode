# CampMode-v2: Git, GitHub & Vercel

Supabase is in `.env.example`; add a real `.env` with the same keys for local dev.

---

## Deploy from Cursor (no terminal)

**One-time setup:** Install Git on your Mac so Cursor can run it. In **Terminal.app** (or iTerm), run:

```bash
xcode-select --install
```

Click **Install** in the dialog. After it finishes, Git is available everywhere—including when the Cursor AI runs commands.

**Then:** In Cursor, just ask:

- *"Commit and push my changes"*
- *"Push to GitHub"*
- *"Deploy to Vercel"*

The AI will run the git/gh/vercel commands for you (see `.cursor/rules/deploy-from-cursor.mdc`). You can also use **Source Control** (branch icon in the sidebar) to stage, commit, and push without typing commands.

**Vercel:** Connect the **campmode** repo once at [vercel.com](https://vercel.com) (Add Project → Import campmode, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). After that, every push from Cursor = automatic deploy.

---

## Terminal fallback (manual)

If you prefer to run commands yourself:

### 1. Git init & first commit

```bash
cd /Users/ben/Desktop/CampMode-v2

git init
git add .
git commit -m "Initial commit: CampMode v2 with Supabase"
```

---

### 2. Push to GitHub repo `campmode`

**Option A – GitHub CLI (if you have `gh` and are logged in):**

```bash
gh repo create campmode --public --source=. --remote=origin --push
```

**Option B – Create repo on GitHub, then push:**

1. Go to [github.com/new](https://github.com/new).
2. Repository name: **campmode**.
3. Public, **do not** add README/license/.gitignore (repo already has content).
4. Create repository, then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/campmode.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

### 3. Deploy to Vercel

**Option A – Vercel CLI:**

```bash
npm i -g vercel
vercel login
vercel
```

Follow prompts; link to the same directory. When asked for env vars, add:

- `VITE_SUPABASE_URL` (from `.env.example`)
- `VITE_SUPABASE_ANON_KEY` (from `.env.example`)

**Option B – Vercel dashboard (after pushing to GitHub):**

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New Project** → Import **campmode**.
3. Leave **Framework Preset**: Vite. **Root Directory**: `.`  
   Build: `npm run build`, Output: `dist`.
4. **Environment Variables** → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (same values as in `.env.example`.)
5. Deploy. Later commits to `main` will auto-deploy.

---

## Summary

| Step | Command / action |
|------|-------------------|
| 1 | `git init` → `git add .` → `git commit -m "Initial commit: CampMode v2 with Supabase"` |
| 2 | Create **campmode** on GitHub, then `git remote add origin ...` and `git push -u origin main` (or use `gh repo create`) |
| 3 | Deploy via **vercel** CLI or connect **campmode** in Vercel and add env vars |

`.gitignore` and `vercel.json` (SPA rewrites) are already set up in the project.
