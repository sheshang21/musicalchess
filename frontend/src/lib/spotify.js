const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCode(code) {
  const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/spotify/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI }),
  });
  if (!resp.ok) throw new Error('token exchange failed');
  return resp.json(); // { access_token, refresh_token, expires_in }
}

export async function refreshToken(refresh_token) {
  const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/spotify/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  if (!resp.ok) throw new Error('refresh failed');
  return resp.json();
}

export function saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem('spotify_access_token', access_token);
  if (refresh_token) localStorage.setItem('spotify_refresh_token', refresh_token);
  localStorage.setItem('spotify_expires_at', String(Date.now() + expires_in * 1000));
}

export function getStoredTokens() {
  return {
    access_token: localStorage.getItem('spotify_access_token'),
    refresh_token: localStorage.getItem('spotify_refresh_token'),
    expires_at: Number(localStorage.getItem('spotify_expires_at') || 0),
  };
}

export function isSpotifyConnected() {
  return !!getStoredTokens().access_token;
}

// Ensures a valid access token, refreshing it first if it's expired.
export async function getValidAccessToken() {
  const { access_token, refresh_token, expires_at } = getStoredTokens();
  if (!access_token) return null;
  if (Date.now() < expires_at - 30000) return access_token;
  if (!refresh_token) return null;
  const fresh = await refreshToken(refresh_token);
  saveTokens({ ...fresh, refresh_token: fresh.refresh_token || refresh_token });
  return fresh.access_token;
}

export async function searchTracks(query) {
  const token = await getValidAccessToken();
  if (!token) throw new Error('not connected to spotify');

  const params = new URLSearchParams({ q: query, type: 'track', limit: '8' });
  const resp = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('search failed');
  const data = await resp.json();

  return data.tracks.items.map((t) => ({
    spotify_track_id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    duration_ms: t.duration_ms,
  }));
}

// Loads the Web Playback SDK once and returns a ready player + device_id.
let sdkPromise = null;
export function loadPlaybackSdk() {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = async () => {
      const token = await getValidAccessToken();
      if (!token) return reject(new Error('not connected'));

      const player = new window.Spotify.Player({
        name: 'Chess + music',
        getOAuthToken: (cb) => getValidAccessToken().then(cb),
        volume: 0.6,
      });

      player.addListener('ready', ({ device_id }) => resolve({ player, deviceId: device_id }));
      player.addListener('initialization_error', ({ message }) => reject(new Error(message)));
      player.addListener('authentication_error', ({ message }) => reject(new Error(message)));

      player.connect();
    };

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export async function playUri(deviceId, uri, positionMs = 0) {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
  });
}

export async function pausePlayback(deviceId) {
  const token = await getValidAccessToken();
  await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}
