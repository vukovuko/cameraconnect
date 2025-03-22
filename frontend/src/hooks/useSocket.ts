import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (sessionId: string): Socket | null => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/', {
      query: { sessionId },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`Connected to server. Socket ID: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  return socketRef.current;
};
