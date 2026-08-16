import { supabase } from './supabase.js';

// Player IDs are generated client-side (crypto.randomUUID()) with no
// real signup step. Anything that references player.id via a foreign
// key (room, queue_track, chat_message) needs the row to exist first --
// call this before using a playerId anywhere it might be a new one.
export async function ensurePlayer(playerId) {
  const { error } = await supabase
    .from('player')
    .upsert({ id: playerId }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) console.error('ensurePlayer failed:', playerId, error);
}
