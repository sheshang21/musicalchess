import { useState } from 'react';

export default function Chat({ chat, sendChat, playerId }) {
  const [body, setBody] = useState('');

  function handleSend() {
    if (!body.trim()) return;
    sendChat(body);
    setBody('');
  }

  return (
    <div className="panel">
      <p className="panel-label">chat</p>
      <ul className="chat-list">
        {chat.map((m) => (
          <li key={m.id} className={m.sender_id === playerId ? 'mine' : ''}>
            {m.body}
          </li>
        ))}
      </ul>
      <div className="add-row">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="type"
        />
        <button onClick={handleSend}>send</button>
      </div>
    </div>
  );
}
