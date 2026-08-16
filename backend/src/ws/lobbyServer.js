import { WebSocketServer } from 'ws';
import { supabase } from '../lib/supabase.js';
import { ensurePlayer } from '../lib/players.js';

// One player waits here until a second player shows up. First-come,
// first-paired -- no room codes, no manual joining.
let waiting = null; // { ws, playerId } | null

export function attachLobbyServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const playerId = url.searchParams.get('player_id');
    console.log('lobby connection:', req.url, 'player:', playerId);

    if (!playerId) {
      console.log('lobby: rejected, no player_id');
      ws.close(4000, 'player_id required');
      return;
    }

    // Anonymous "accounts" are created lazily on first sight, since
    // there's no real signup step -- this must happen before this id
    // can be used as a foreign key anywhere (room, chat, queue).
    await ensurePlayer(playerId);

    if (waiting && waiting.ws.readyState === waiting.ws.OPEN && waiting.playerId !== playerId) {
      // Someone's already here -- pair up and create the room.
      const opponent = waiting;
      waiting = null;

      const { data: room, error } = await supabase
        .from('room')
        .insert({ player_a_id: opponent.playerId, player_b_id: playerId, status: 'active' })
        .select()
        .single();

      if (error) {
        console.error('lobby: room creation failed:', error);
        const failMsg = JSON.stringify({ type: 'error', message: 'could not create room' });
        ws.send(failMsg);
        if (opponent.ws.readyState === opponent.ws.OPEN) opponent.ws.send(failMsg);
        return;
      }

      const { error: playbackError } = await supabase
        .from('playback_state')
        .insert({ room_id: room.id });
      if (playbackError) console.error('lobby: playback_state insert failed:', playbackError);

      console.log('lobby: matched', opponent.playerId, '+', playerId, '-> room', room.id);
      const payload = JSON.stringify({ type: 'matched', room_id: room.id });
      opponent.ws.send(payload);
      ws.send(payload);
      opponent.ws.close(1000, 'matched');
      ws.close(1000, 'matched');
    } else {
      // Nobody waiting -- take this spot.
      waiting = { ws, playerId };
      ws.send(JSON.stringify({ type: 'waiting' }));

      ws.on('close', () => {
        if (waiting?.ws === ws) waiting = null;
      });
    }
  });

  return wss;
}
