import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { roomsRouter } from './routes/rooms.js';
import { spotifyRouter } from './routes/spotify.js';
import { attachRoomServer } from './ws/roomServer.js';
import { attachLobbyServer } from './ws/lobbyServer.js';

const app = express();
const allowedOrigin = (process.env.FRONTEND_ORIGIN || '*').replace(/\/$/, '');
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', roomsRouter);
app.use('/api', spotifyRouter);

const server = createServer(app);
const roomWss = attachRoomServer(server);
const lobbyWss = attachLobbyServer(server);

// Both ws servers use noServer mode -- we route each upgrade request to
// the right one ourselves by pathname. Attaching two `path`-based
// WebSocketServer instances directly to one http.Server doesn't work:
// the first one registered aborts every non-matching request with a
// 400 before the second server ever sees it.
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/ws') {
    roomWss.handleUpgrade(req, socket, head, (ws) => {
      roomWss.emit('connection', ws, req);
    });
  } else if (pathname === '/lobby') {
    lobbyWss.handleUpgrade(req, socket, head, (ws) => {
      lobbyWss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
