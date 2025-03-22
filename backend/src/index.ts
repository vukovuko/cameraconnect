import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

app.get('/', (_req, res) => {
  res.send('Remote support MVP backend is running');
});

io.on('connection', (socket) => {
  const sessionId = socket.handshake.query.sessionId;
  if (typeof sessionId !== 'string') {
    socket.disconnect();
    return;
  }

  console.log(`Socket ${socket.id} connected to session ${sessionId}`);
  socket.join(sessionId);

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected from session ${sessionId}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
