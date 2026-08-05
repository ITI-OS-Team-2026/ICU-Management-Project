# Deploying SmartCare ICU for Free

Backend on **Render** (free Web Service, builds from `server/Dockerfile`), frontend on **Vercel** (free static hosting), database stays on **Neon** (already hosted, no change). Both platforms deploy from GitHub, so push your commits before starting.

Two pieces of infrastructure-as-code are already in the repo to make this faster:
- [`render.yaml`](../render.yaml) — a Render "Blueprint" listing the backend service and its required env vars (secrets are marked `sync: false`, meaning Render will prompt you to type them in rather than storing them in this file).
- [`client/vercel.json`](../client/vercel.json) — a rewrite rule so client-side routing (React Router) works on refresh/direct links instead of 404ing.

A code change was made to support this specific topology: the auth cookie now uses `SameSite=None; Secure` in production instead of `Strict` (see `server/src/config/env.js`), because the frontend and backend will live on two different domains (`*.vercel.app` and `*.onrender.com`) — that's a genuinely cross-site request, and `Strict` cookies are never sent on those. Localhost dev is unaffected; it still uses `Strict`.

---

## 1. Push to GitHub

```bash
git push origin main
```

Both Render and Vercel deploy from your GitHub repo, not your local disk — nothing below works until this is pushed.

## 2. Deploy the backend on Render

1. Go to [render.com](https://render.com) and sign up/log in with GitHub.
2. **New → Blueprint**, select this repo. Render reads `render.yaml` and proposes the `smartcare-icu-backend` service automatically.
3. It will prompt you for the env vars marked `sync: false` in `render.yaml`. Enter the same values you have in `server/.env`:
   - `DATABASE_URL` (your Neon connection string)
   - `JWT_SECRET`
   - `CLIENT_ORIGIN` — leave a placeholder for now (e.g. `http://localhost:5173`); you'll come back and set this to your real Vercel URL in step 4
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (if you use Cloudinary)
   - `BEDROCK_API_URL` / `BEDROCK_API_KEY`
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (only needed if you plan to run the seed script against production — optional)
4. Deploy. First build takes a few minutes (same Docker build we tested locally). Once live, note the URL Render gives you, e.g. `https://smartcare-icu-backend.onrender.com`.

**Free tier caveat:** Render's free Web Service spins down after 15 minutes of no traffic. The next request after that wakes it back up, which takes ~30–50 seconds. Fine for a demo; just don't be surprised by the first load being slow after idle time.

## 3. Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/log in with GitHub.
2. **Add New → Project**, select this repo.
3. Set **Root Directory** to `client` (this is a monorepo — Vercel needs to know the frontend lives in a subfolder). It auto-detects the Vite framework preset from there.
4. Add an environment variable: `VITE_API_URL` = `https://smartcare-icu-backend.onrender.com/api` (your actual Render URL from step 2, with `/api` on the end — matches how `client/src/lib/api.js` is already written).
5. Deploy. Note the URL Vercel gives you, e.g. `https://smartcare-icu.vercel.app`.

## 4. Connect them: fix CORS

Go back to the Render dashboard → your backend service → Environment, and set `CLIENT_ORIGIN` to your real Vercel URL from step 3 (e.g. `https://smartcare-icu.vercel.app`, no trailing slash). Save — Render redeploys automatically. This is what the backend's CORS check (`server/app.js`) allows requests from.

## 5. Test it

Open your Vercel URL and log in with your seeded credentials. If login succeeds but you're immediately bounced back to `/login`, the most likely cause is `CLIENT_ORIGIN` not exactly matching the Vercel URL (protocol + no trailing slash) — the browser will silently drop a cross-site cookie whose CORS preflight didn't come back with a matching `Access-Control-Allow-Origin`.

## What you get, for $0/month

| Piece | Host | Free tier limits |
|---|---|---|
| Frontend | Vercel | Generous bandwidth, always-on, no cold start |
| Backend | Render | Free Web Service, sleeps after 15 min idle |
| Database | Neon | Already in use — free tier serverless Postgres |
