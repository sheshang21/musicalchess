import { useState, useCallback, useRef } from 'react';

export function useLobby(playerId) {
  const [status, setStatus] = useState('idle'); // idle | waiting | matched | error
  const wsRef = useRef(null);

  const findMatch = useCallback(
    (onMatched) => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws');
      const ws = new WebSocket(`${backendUrl}/lobby?player_id=${playerId}`);
      wsRef.current = ws;
      setStatus('waiting');

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'matched') {
          setStatus('matched');
          onMatched(msg.room_id);
        } else if (msg.type === 'error') {
          setStatus('error');
        }
      };

      ws.onclose = () => {
        setStatus((s) => (s === 'matched' ? s : 'idle'));
      };
    },
    [playerId]
  );

  const cancel = useCallback(() => {
    wsRef.current?.close();
    setStatus('idle');
  }, []);

  return { status, findMatch, cancel };
}
