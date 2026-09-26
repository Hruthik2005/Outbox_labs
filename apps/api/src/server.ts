import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { emailQueue } from './queue/email.queue.js';
import { initializeElasticsearchIndex } from './config/elasticsearch.js';
import { closeAllTransports } from './integrations/smtp/ethereal.client.js';

const app = createApp();
const server = http.createServer(app);

let isShuttingDown = false;

async function startServer() {
  try {
    await initializeElasticsearchIndex();

    server.listen(env.API_PORT, () => {
      logger.info(`🚀 ReachInbox API server listening on port ${env.API_PORT} [${env.NODE_ENV}]`);
      logger.info(`📊 Bull Board Dashboard active at: http://localhost:${env.API_PORT}/admin/queues`);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start API server');
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown initiated...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await emailQueue.close();
      logger.info('BullMQ email queue closed');

      closeAllTransports();

      await redis.quit();
      logger.info('Redis client disconnected');

      await prisma.$disconnect();
      logger.info('Prisma database client disconnected');

      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
