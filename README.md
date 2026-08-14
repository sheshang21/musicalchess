# Chess + shared music

Play chess against a stranger (via Lichess), control a shared music queue together, and chat — all in one room.

## Stack
- **Frontend** (`/frontend`) — React + Vite. Deploy to Vercel.
- **Backend** (`/backend`) — Node + Express + WebSocket (room server: queue, playback state, chat). Deploy to Render.
- **Database** (`/supabase`) — Postgres via Supabase. Run `supabase/schema.sql` in the Supabase SQL editor to set up tables.

## Local dev

```bash
# backend
cd backend
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY
npm install
npm run dev             # http://localhost:3001

# frontend
cd frontend
cp .env.example .env    # fill in VITE_BACKEND_URL, VITE_SPOTIFY_CLIENT_ID
npm install
npm run dev              # http://localhost:5173
```

## Deploy

**Backend -> Render**
1. New Web Service, point at `/backend`.
2. Build command: `npm install`. Start command: `npm start`.
3. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_ORIGIN` (your Vercel URL), `PORT` (Render sets this automatically).

**Frontend -> Vercel**
1. Import repo, set root directory to `/frontend`.
2. Framework preset: Vite.
3. Env vars: `VITE_BACKEND_URL` (your Render backend URL, e.g. `https://your-app.onrender.com`), `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_REDIRECT_URI` (your Vercel URL + `/callback`).

**Database -> Supabase**
1. Create a project.
2. SQL editor -> paste `supabase/schema.sql` -> run.
3. Copy the project URL and `service_role` key (backend only — never expose this key to the frontend) into the backend env vars.

## What's stubbed vs real
- Lichess: real API calls (no auth needed for basic game state/seeking).
- Spotify: real OAuth + Web Playback SDK wiring, but you'll need to register an app at developer.spotify.com and add your redirect URI.
- Room server: fully functional WebSocket relay + Supabase persistence.
