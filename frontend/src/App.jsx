import { useState } from 'react';
import Board from './components/Board.jsx';
import PlaylistPanel from './components/PlaylistPanel.jsx';
import Chat from './components/Chat.jsx';
import Callback from './components/Callback.jsx';
import { useRoomSocket } from './hooks/useRoomSocket.js';
import { useLobby } from './hooks/useLobby.js';
import { getAuthUrl, isSpotifyConnected } from './lib/spotify.js';
import './styles.css';

// TODO: replace with real auth -- for now, a stable per-browser id plus
// a handle the player can set themselves or leave randomly assigned.
function getPlayerId() {
  let id = localStorage.getItem('player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('player_id', id);
  }
  return id;
}

function randomHandle() {
  const n = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();
  return 'ANON-' + n;
}

function getHandle() {
  return localStorage.getItem('player_handle') || randomHandle();
}

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [handle, setHandle] = useState(getHandle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(handle);
  const [spotifyConnected, setSpotifyConnected] = useState(isSpotifyConnected());
  const playerId = getPlayerId();
  const room = useRoomSocket(roomId, playerId);
  const lobby = useLobby(playerId);

  if (window.location.pathname === '/callback') return <Callback />;

  function saveHandle(next) {
    const clean = next.trim().slice(0, 20) || randomHandle();
    localStorage.setItem('player_handle', clean);
    setHandle(clean);
    setDraft(clean);
    setEditing(false);
  }

  function reroll() {
    saveHandle(randomHandle());
  }

  if (!roomId) {
    return (
      <div className="landing">
        <p className="id-line">signed in as</p>
        <div className="handle-row">
          {editing ? (
            <>
              <input
                autoFocus
                value={draft}
                maxLength={20}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveHandle(draft)}
              />
              <button onClick={() => saveHandle(draft)}>save</button>
            </>
          ) : (
            <>
              <h1 className="handle">{handle}</h1>
              <button onClick={() => setEditing(true)}>rename</button>
              <button onClick={reroll}>reroll</button>
            </>
          )}
        </div>
        <p className="tagline">
          One board, one playlist, two strangers. Whoever's in the room controls both.
        </p>
        {lobby.status === 'waiting' ? (
          <div className="waiting-row">
            <p className="waiting-text">looking for an opponent…</p>
            <button onClick={lobby.cancel}>cancel</button>
          </div>
        ) : spotifyConnected ? (
          <button onClick={() => lobby.findMatch(setRoomId)}>
            play a stranger →
          </button>
        ) : (
          <div>
            <p className="tagline">connect spotify first — both players need it for the shared queue.</p>
            <button onClick={() => (window.location.href = getAuthUrl())}>
              connect spotify →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <span>room {roomId.slice(0, 8)}</span>
        <span>you are <strong>{handle}</strong></span>
      </div>
      <div className="main-panel">
        <Board roomId={roomId} playerId={playerId} playback={room.playback} updatePlayback={room.updatePlayback} />
      </div>
      <div className="side-panel">
        <PlaylistPanel
          queue={room.queue}
          playback={room.playback}
          addTrack={room.addTrack}
          removeTrack={room.removeTrack}
          updatePlayback={room.updatePlayback}
        />
        <Chat chat={room.chat} sendChat={room.sendChat} playerId={playerId} />
      </div>
    </div>
  );
}
