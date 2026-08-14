// Lichess's board API. For a fully custom UI, players authenticate with
// Lichess OAuth (scope: board:play) and you drive moves through
// /api/board/game/stream/{id} and /api/board/game/{id}/move/{move}.
// Docs: https://lichess.org/api#tag/Board

const LICHESS_API = 'https://lichess.org/api';

export async function seekGame(token, { time = 5, increment = 3, rated = false } = {}) {
  // Streams until matched with an opponent; returns when the seek resolves.
  const resp = await fetch(`${LICHESS_API}/board/seek`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      rated: String(rated),
      time: String(time),
      increment: String(increment),
      variant: 'standard',
    }),
  });
  return resp;
}

export function streamGame(token, gameId, onEvent) {
  const controller = new AbortController();

  fetch(`${LICHESS_API}/board/game/stream/${gameId}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  }).then(async (resp) => {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) onEvent(JSON.parse(line));
      }
    }
  });

  return () => controller.abort();
}

export async function makeMove(token, gameId, move) {
  return fetch(`${LICHESS_API}/board/game/${gameId}/move/${move}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
