import http from 'node:http';
import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { initSocketIO } from './sockets/index.js';
import { startCronJobs } from './jobs/index.js';

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', { error: err.message, stack: err.stack });
  process.exit(1);
});

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);

  // Initialize Socket.io server
  initSocketIO(server);

  // Start background cron jobs
  startCronJobs();

  server.listen(env.PORT, () => {
    logger.info(`🚀 ${env.APP_NAME} API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`📖 API Documentation available at http://localhost:${env.PORT}/api/docs`);
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Closing HTTP server gracefully.`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });

    // Force shutdown after 10 seconds timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', { reason });
    server.close(() => process.exit(1));
  });
}

bootstrap().catch((err) => {
  logger.error(`Bootstrap failure: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
