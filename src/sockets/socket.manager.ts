import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { corsOptions } from '../config/cors';
import { initializeSocket } from './transactions.socket';
import { env } from '../config/env';

let io: SocketServer;

export function createSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  initializeSocket(io);

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}