import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.utils';
import { Transaction, TransactionEvent } from '../types';

let io: Server;

export function initializeSocket(socketServer: Server): void {
  io = socketServer;

  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      (socket.data as any).userId = payload.userId;
      (socket.data as any).email = payload.email;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as any).userId;
    console.log(`🔌 User connected: ${userId}`);

    // Join user's private room
    socket.join(`user:${userId}`);

    socket.emit('user:connected', {
      message: 'Connected to real-time updates',
      userId,
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });
}

export function emitTransactionEvent(
  event: TransactionEvent,
  transaction: Transaction,
  userId: string
): void {
  if (!io) return;

  io.to(`user:${userId}`).emit(event, {
    event,
    transaction,
    userId,
    timestamp: new Date().toISOString(),
  });
}