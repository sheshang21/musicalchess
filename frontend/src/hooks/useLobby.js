import { useState, useCallback, useRef } from 'react';

export function useLobby(playerId) {
  const [status, setStatus] = useState('idle'); // idle | waiting | matched | error
  const [errorDetail, setErrorDetail] = useState('');
  const wsRef = useRef(null);
  const retriedRef = useRef(false);

  const connect = useCallback(
    (onMatched) => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws').replace(/\/$/, '');
      const ws = new WebSocket(`${backendUrl}/lobby?player_id=${playerId}`);
      wsRef.current = ws;
      setStatus('waiting');

      let openedOk = false;
      ws.onopen = () => { openedOk = true; };

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
        console.error('lobby ws error');
      };

      ws.onclose = (event) => {
        console.log('lobby ws closed', event.code, event.reason);
        if (event.code === 1000) {
          setStatus('idle');
          return;
        }

        // Handshake never completed and we haven't retried yet -- likely
        // a cold-start hiccup (e.g. a sleeping free-tier instance waking
        // up). Retry once automatically before bothering the user.
        if (!openedOk && !retriedRef.current) {
          retriedRef.current = true;
          setTimeout(() => connect(onMatched), 1500);
          return;
        }

        setErrorDetail(`connection closed (${event.code}) -- check backend logs`);
        setStatus('error');
      };
    },
    [playerId]
  );

  const findMatch = useCallback(
    (onMatched) => {
      setErrorDetail('');
      retriedRef.current = false;
      connect(onMatched);
    },
    [connect]
  );

  const cancel = useCallback(() => {
    wsRef.current?.close(1000, 'user cancelled');
    setStatus('idle');
  }, []);

  return { status, errorDetail, findMatch, cancel };
}
