import { WebSocketServer } from 'ws';
import { supabase } from '../lib/supabase.js';
import { ensurePlayer } from '../lib/players.js';

// room_id -> Set of ws connections
const rooms = new Map();

function broadcast(roomId, message) {
  const conns = rooms.get(roomId);
  if (!conns) return;
  const payload = JSON.stringify(message);
  for (const ws of conns) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

async function getFullState(roomId) {
  const [{ data: queue }, { data: playback }, { data: chat }] = await Promise.all([
    supabase.from('queue_track').select('*').eq('room_id', roomId).order('position'),
    supabase.from('playback_state').select('*').eq('room_id', roomId).single(),
    supabase.from('chat_message').select('*').eq('room_id', roomId).order('sent_at').limit(50),
  ]);
  return { queue: queue || [], playback: playback || null, chat: chat || [] };
}

export function attachRoomServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const roomId = url.searchParams.get('room_id');
    const playerId = url.searchParams.get('player_id');

    if (!roomId || !playerId) {
      ws.close(4000, 'room_id and player_id required');
      return;
    }

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(ws);

    ensurePlayer(playerId);

    // Send full current state immediately on connect/reconnect so the
    // client resyncs, no matter how long it was disconnected.
    getFullState(roomId).then((state) => {
      ws.send(JSON.stringify({ type: 'sync', ...state }));
    });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case 'queue:add': {
          const { data: existing } = await supabase
            .from('queue_track')
            .select('position')
            .eq('room_id', roomId)
            .order('position', { ascending: false })
            .limit(1);
          const nextPos = existing?.[0] ? existing[0].position + 1 : 0;

          const { data } = await supabase
            .from('queue_track')
            .insert({
              room_id: roomId,
              spotify_track_id: msg.track.spotify_track_id,
              title: msg.track.title,
              artist: msg.track.artist,
              duration_ms: msg.track.duration_ms,
              added_by: playerId,
              position: nextPos,
            })
            .select()
            .single();

          broadcast(roomId, { type: 'queue:updated', track_added: data });
          break;
        }

        case 'queue:remove': {
          await supabase.from('queue_track').delete().eq('id', msg.track_id).eq('room_id', roomId);
          broadcast(roomId, { type: 'queue:updated', track_removed: msg.track_id });
          break;
        }

        case 'playback:update': {
          // msg: { current_track_id, position_ms, is_playing }
          const { data } = await supabase
            .from('playback_state')
            .update({
              current_track_id: msg.current_track_id,
              position_ms: msg.position_ms,
              is_playing: msg.is_playing,
              updated_at: new Date().toISOString(),
            })
            .eq('room_id', roomId)
            .select()
            .single();

          broadcast(roomId, { type: 'playback:updated', playback: data });
          break;
        }

        case 'chat:send': {
          const { data } = await supabase
            .from('chat_message')
            .insert({ room_id: roomId, sender_id: playerId, body: msg.body })
            .select()
            .single();

          broadcast(roomId, { type: 'chat:new', message: data });
          break;
        }

        default:
          break;
      }
    });

    ws.on('close', () => {
      rooms.get(roomId)?.delete(ws);
      if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
    });
  });

  return wss;
}
