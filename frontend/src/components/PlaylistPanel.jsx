import { useState, useEffect, useRef } from 'react';
import { searchTracks, loadPlaybackSdk, playUri, pausePlayback } from '../lib/spotify.js';

export default function PlaylistPanel({ queue, playback, addTrack, removeTrack, updatePlayback }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const deviceRef = useRef(null);

  useEffect(() => {
    loadPlaybackSdk()
      .then(({ deviceId }) => {
        deviceRef.current = deviceId;
      })
      .catch(() => {
        // Player couldn't initialize -- usually means not connected yet
        // or a non-Premium account. Queue control still works either way.
      });
  }, []);

  // Follow the room's shared playback state: whenever the current track
  // or play/pause flag changes, mirror it on this player's own device.
  useEffect(() => {
    if (!deviceRef.current || !playback) return;
    const track = queue.find((t) => t.id === playback.current_track_id);
    if (!track) return;

    if (playback.is_playing) {
      playUri(deviceRef.current, track.uri || `spotify:track:${track.spotify_track_id}`, playback.position_ms);
    } else {
      pausePlayback(deviceRef.current);
    }
  }, [playback?.current_track_id, playback?.is_playing]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const tracks = await searchTracks(query);
      setResults(tracks);
    } catch {
      setError('search failed -- check your spotify connection');
    } finally {
      setSearching(false);
    }
  }

  function playTrack(track) {
    updatePlayback({ current_track_id: track.id, position_ms: 0, is_playing: true });
  }

  const currentTrack = queue.find((t) => t.id === playback?.current_track_id);

  return (
    <div className="panel">
      <p className="panel-label">queue</p>
      {currentTrack && (
        <p className="now-playing">
          {currentTrack.title} — {currentTrack.artist}
        </p>
      )}
      <div className="add-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="search a track"
        />
        <button onClick={handleSearch} disabled={searching}>
          {searching ? '…' : 'search'}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}

      {results.length > 0 && (
        <ul className="queue-list">
          {results.map((track) => (
            <li key={track.spotify_track_id}>
              <span>{track.title} — {track.artist}</span>
              <button onClick={() => { addTrack(track); setResults([]); setQuery(''); }}>+</button>
            </li>
          ))}
        </ul>
      )}

      <p className="panel-label" style={{ marginTop: 16 }}>up next</p>
      <ul className="queue-list">
        {queue.map((track) => (
          <li key={track.id}>
            <span onClick={() => playTrack(track)}>{track.title} — {track.artist}</span>
            <button onClick={() => removeTrack(track.id)} aria-label="remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
