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

  const room = io.sockets.adapter.rooms.get(sessionId);
  console.log(`Socket ${socket.id} connected to session ${sessionId}. Room size: ${room?.size}`);

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected from session ${sessionId}`);
  });

  socket.on('webrtc-offer', ({ sessionId, sdp, type }) => {
    console.log(`[BACKEND] Offer received from ${socket.id} for session ${sessionId}`);
    console.log(`[BACKEND] Broadcasting offer to room ${sessionId}`);
    io.to(sessionId).emit('webrtc-offer', { sdp, type });
  });
  
  socket.onAny((event, ...args) => {
    console.log(`[Agent socket received] ${event}:`, args);
  });

  socket.on('webrtc-answer', ({ sessionId, sdp, type }) => {
    console.log(`[BACKEND] Answer received from ${socket.id}, broadcasting to ${sessionId}`);
    socket.to(sessionId).emit('webrtc-answer', { sdp, type });
  });

  socket.on('webrtc-ice-candidate', ({ sessionId, candidate }) => {
    console.log(`[BACKEND] Relaying ICE candidate for session ${sessionId}`);
    socket.to(sessionId).emit('webrtc-ice-candidate', { candidate });
  });  
  
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
