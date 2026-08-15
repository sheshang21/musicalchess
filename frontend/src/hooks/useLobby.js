import { useState, useCallback, useRef } from 'react';

export function useLobby(playerId) {
  const [status, setStatus] = useState('idle'); // idle | waiting | matched | error
  const [errorDetail, setErrorDetail] = useState('');
  const wsRef = useRef(null);

  const findMatch = useCallback(
    (onMatched) => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws');
      const ws = new WebSocket(`${backendUrl}/lobby?player_id=${playerId}`);
      wsRef.current = ws;
      setStatus('waiting');
      setErrorDetail('');

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'matched') {
          setStatus('matched');
          onMatched(msg.room_id);
        } else if (msg.type === 'error') {
          setStatus('error');
          setErrorDetail(msg.message || 'unknown error');
        }
      };

      ws.onerror = () => {
        // Fires on connection failures (wrong URL, server down, etc).
        console.error('lobby ws error');
      };

      ws.onclose = (event) => {
        // Log the real reason -- 1000 is a normal close, anything else
        // (1006 especially) means the connection dropped unexpectedly.
        console.log('lobby ws closed', event.code, event.reason);
        setStatus((s) => {
          if (s === 'matched') return s;
          if (event.code !== 1000) {
            setErrorDetail(`connection closed (${event.code}) -- check backend logs`);
            return 'error';
          }
          return 'idle';
        });
      };
    },
    [playerId]
  );

  const cancel = useCallback(() => {
    wsRef.current?.close(1000, 'user cancelled');
    setStatus('idle');
  }, []);

  return { status, errorDetail, findMatch, cancel };
}
