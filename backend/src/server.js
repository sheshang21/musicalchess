import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { roomsRouter } from './routes/rooms.js';
import { spotifyRouter } from './routes/spotify.js';
import { attachRoomServer } from './ws/roomServer.js';
import { attachLobbyServer } from './ws/lobbyServer.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', roomsRouter);
app.use('/api', spotifyRouter);

const server = createServer(app);
attachRoomServer(server); // wires up ws at /ws
attachLobbyServer(server); // wires up ws at /lobby

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
