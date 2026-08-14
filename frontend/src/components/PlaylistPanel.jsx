import { useState } from 'react';

export default function PlaylistPanel({ queue, playback, addTrack, removeTrack, updatePlayback }) {
  const [query, setQuery] = useState('');

  // Placeholder search -- swap in a real call to Spotify's /v1/search
  // endpoint using the logged-in player's access token.
  function handleAddDemo() {
    if (!query.trim()) return;
    addTrack({
      spotify_track_id: crypto.randomUUID(),
      title: query,
      artist: 'Unknown artist',
      duration_ms: 200000,
    });
    setQuery('');
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
          placeholder="track name"
        />
        <button onClick={handleAddDemo}>add</button>
      </div>
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
