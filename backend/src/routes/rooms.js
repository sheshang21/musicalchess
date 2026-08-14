import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const roomsRouter = Router();

// Create a new room, waiting for an opponent.
roomsRouter.post('/rooms', async (req, res) => {
  const { player_id, lichess_game_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });

  const { data, error } = await supabase
    .from('room')
    .insert({ player_a_id: player_id, lichess_game_id, status: 'waiting' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('playback_state').insert({ room_id: data.id });

  res.json(data);
});

// Second player joins an existing room.
roomsRouter.post('/rooms/:id/join', async (req, res) => {
  const { player_id } = req.body;
  const { id } = req.params;

  const { data, error } = await supabase
    .from('room')
    .update({ player_b_id: player_id, status: 'active' })
    .eq('id', id)
    .eq('status', 'waiting')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(409).json({ error: 'room already full or not found' });

  res.json(data);
});

roomsRouter.get('/rooms/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('room')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'room not found' });
  res.json(data);
});
