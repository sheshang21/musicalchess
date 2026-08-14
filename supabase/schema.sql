-- Run this in the Supabase SQL editor.

create table if not exists player (
  id uuid primary key default gen_random_uuid(),
  lichess_username text,
  spotify_user_id text,
  created_at timestamptz not null default now()
);

create table if not exists room (
  id uuid primary key default gen_random_uuid(),
  lichess_game_id text,
  player_a_id uuid references player(id),
  player_b_id uuid references player(id),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists queue_track (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references room(id) on delete cascade,
  spotify_track_id text not null,
  title text not null,
  artist text not null,
  duration_ms integer not null,
  added_by uuid references player(id),
  position integer not null,
  played boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists playback_state (
  room_id uuid primary key references room(id) on delete cascade,
  current_track_id uuid references queue_track(id),
  position_ms integer not null default 0,
  is_playing boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists chat_message (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references room(id) on delete cascade,
  sender_id uuid references player(id),
  body text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_queue_track_room on queue_track(room_id, position);
create index if not exists idx_chat_message_room on chat_message(room_id, sent_at);

-- Row Level Security: locked down by default. The backend uses the
-- service_role key (bypasses RLS), so the frontend never talks to
-- Supabase directly -- everything goes through your Render API/WebSocket.
alter table player enable row level security;
alter table room enable row level security;
alter table queue_track enable row level security;
alter table playback_state enable row level security;
alter table chat_message enable row level security;
