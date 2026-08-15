import { useEffect, useRef, useState, useCallback } from 'react';

export function useRoomSocket(roomId, playerId) {
  const wsRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [playback, setPlayback] = useState(null);
  const [chat, setChat] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomId || !playerId) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL.replace(/^http/, 'ws').replace(/\/$/, '');
    const ws = new WebSocket(`${backendUrl}/ws?room_id=${roomId}&player_id=${playerId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'sync':
          // Full resync -- sent on every connect/reconnect.
          setQueue(msg.queue);
          setPlayback(msg.playback);
          setChat(msg.chat);
          break;
        case 'queue:updated':
          setQueue((prev) => {
            if (msg.track_added) return [...prev, msg.track_added];
            if (msg.track_removed) return prev.filter((t) => t.id !== msg.track_removed);
            return prev;
          });
          break;
        case 'playback:updated':
          setPlayback(msg.playback);
          break;
        case 'chat:new':
          setChat((prev) => [...prev, msg.message]);
          break;
        default:
          break;
      }
    };

    return () => ws.close();
  }, [roomId, playerId]);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const addTrack = useCallback((track) => send({ type: 'queue:add', track }), [send]);
  const removeTrack = useCallback((trackId) => send({ type: 'queue:remove', track_id: trackId }), [send]);
  const updatePlayback = useCallback(
    (state) => send({ type: 'playback:update', ...state }),
    [send]
  );
  const sendChat = useCallback((body) => send({ type: 'chat:send', body }), [send]);

  return { connected, queue, playback, chat, addTrack, removeTrack, updatePlayback, sendChat };
}
