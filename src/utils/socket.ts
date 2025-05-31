// utils/socket.ts
import { io, Socket } from 'socket.io-client';

let singletonSocket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client. On first call, it does `io(...)`.
 * Subsequent calls return the same instance.
 */
export function getSocket(): Socket {
  if (!singletonSocket) {
    singletonSocket = io('/', {
      path: '/api/socket_io',
      // you can set other options here (like auth, reconnection, etc.)
    });
  }
  return singletonSocket;
}
