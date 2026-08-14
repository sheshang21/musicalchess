import { Router } from 'express';

export const spotifyRouter = Router();

// Frontend sends the auth code it got from Spotify's redirect; backend
// exchanges it for tokens using the client secret (must stay server-side).
spotifyRouter.post('/spotify/token', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'code and redirect_uri required' });
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await resp.json();
  if (!resp.ok) return res.status(resp.status).json(data);

  // access_token, refresh_token, expires_in returned to the frontend,
  // which holds them client-side for that player's own SDK/API calls.
  res.json(data);
});

spotifyRouter.post('/spotify/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await resp.json();
  if (!resp.ok) return res.status(resp.status).json(data);
  res.json(data);
});
