import { useState, useEffect, useRef } from 'react';
import {
  searchTracks,
  getMyPlaylists,
  getPlaylistTracks,
  loadPlaybackSdk,
  playUri,
  pausePlayback,
} from '../lib/spotify.js';

export default function PlaylistPanel({ queue, playback, addTrack, removeTrack, updatePlayback }) {
  const [query, setQuery] = useState('');
  const [browseTracks, setBrowseTracks] = useState([]);
  const [browseLabel, setBrowseLabel] = useState('');
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const deviceRef = useRef(null);

  useEffect(() => {
    loadPlaybackSdk()
      .then(({ deviceId }) => { deviceRef.current = deviceId; })
      .catch((e) => setError(`spotify player unavailable: ${e.message}`));

    getMyPlaylists()
      .then(setMyPlaylists)
      .catch((e) => setError(e.message));
  }, []);

  // Follow the room's shared playback state: whenever the current track
  // or play/pause flag changes, mirror it on this player's own device.
  useEffect(() => {
    if (!deviceRef.current || !playback) return;
    const track = queue.find((t) => t.id === playback.current_track_id);
    if (!track) return;

    if (playback.is_playing) {
      playUri(deviceRef.current, track.uri || `spotify:track:${track.spotify_track_id}`, playback.position_ms)
        .catch((e) => setError(`playback failed: ${e.message}`));
    } else {
      pausePlayback(deviceRef.current);
    }
  }, [playback?.current_track_id, playback?.is_playing]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const tracks = await searchTracks(query);
      setBrowseTracks(tracks);
      setBrowseLabel(`results for "${query}"`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openPlaylist(playlist) {
    setLoading(true);
    setError('');
    try {
      const tracks = await getPlaylistTracks(playlist.id);
      setBrowseTracks(tracks);
      setBrowseLabel(playlist.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // One click: add to the shared queue and play it immediately -- no
  // separate "add" then "play" step.
  function playNow(track) {
    addTrack(track, (savedTrack) => {
      updatePlayback({ current_track_id: savedTrack.id, position_ms: 0, is_playing: true });
    });
  }

  function playFromQueue(track) {
    updatePlayback({ current_track_id: track.id, position_ms: 0, is_playing: true });
  }

  const currentTrack = queue.find((t) => t.id === playback?.current_track_id);

  return (
    <div className="panel">
      <p className="panel-label">queue</p>
      {currentTrack && (
        <p className="now-playing">{currentTrack.title} — {currentTrack.artist}</p>
      )}
      {error && <p className="error-text">{error}</p>}

      <div className="add-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="search a track"
        />
        <button onClick={handleSearch} disabled={loading}>{loading ? '…' : 'search'}</button>
      </div>

      {myPlaylists.length > 0 && (
        <>
          <p className="panel-label" style={{ marginTop: 16 }}>your playlists</p>
          <ul className="queue-list">
            {myPlaylists.map((p) => (
              <li key={p.id} onClick={() => openPlaylist(p)}>
                <span>{p.name}</span>
                <span style={{ color: '#999', fontSize: 11 }}>{p.trackCount}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {browseTracks.length > 0 && (
        <>
          <p className="panel-label" style={{ marginTop: 16 }}>{browseLabel}</p>
          <ul className="queue-list">
            {browseTracks.map((track) => (
              <li key={track.spotify_track_id} onClick={() => playNow(track)}>
                <span>{track.title} — {track.artist}</span>
                <span style={{ fontSize: 12 }}>▶</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="panel-label" style={{ marginTop: 16 }}>up next</p>
      <ul className="queue-list">
        {queue.map((track) => (
          <li key={track.id}>
            <span onClick={() => playFromQueue(track)}>{track.title} — {track.artist}</span>
            <button onClick={() => removeTrack(track.id)} aria-label="remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
