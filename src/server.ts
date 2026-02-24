import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './sockets/socket.manager';
import { testConnection } from './config/database';
import { env } from './config/env';

async function startServer(): Promise<void> {
  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Attach Socket.io
  createSocketServer(server);

  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Start server
  server.listen(env.PORT, () => {
    console.log('');
    console.log('🚀 Family Finance API');
    console.log('========================');
    console.log(`✅ Server running on port ${env.PORT}`);
    console.log(`✅ Environment: ${env.NODE_ENV}`);
    console.log(`✅ API: http://localhost:${env.PORT}/api/v1`);
    console.log(`✅ Health: http://localhost:${env.PORT}/health`);
    console.log(`✅ WebSocket: ws://localhost:${env.PORT}`);
    console.log('========================');
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});