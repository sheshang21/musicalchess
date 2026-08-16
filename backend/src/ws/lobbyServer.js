import { WebSocketServer } from 'ws';
import { supabase } from '../lib/supabase.js';

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
        ws.send(JSON.stringify({ type: 'error', message: 'could not create room' }));
        return;
      }

      await supabase.from('playback_state').insert({ room_id: room.id });

      const payload = JSON.stringify({ type: 'matched', room_id: room.id });
      opponent.ws.send(payload);
      ws.send(payload);
      opponent.ws.close();
      ws.close();
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
