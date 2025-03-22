import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (sessionId: string): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io('http://localhost:3000', {
      query: { sessionId },
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to server. Socket ID:', socketInstance.id);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId]);

  return socket;
};
