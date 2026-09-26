import { createEmailWorker } from './queue/worker.js';
import { queueEvents } from './queue/worker.events.js';
import { startOutboxRecoveryLoop, stopOutboxRecoveryLoop } from './utils/outbox-recovery.js';
import { emailSenderService } from './services/email-sender.service.js';
import { prisma, redis, workerConfig } from './config/worker.config.js';
import { logger } from './utils/logger.js';

logger.info(
  {
    concurrency: workerConfig.WORKER_CONCURRENCY,
    minDelayMs: workerConfig.MIN_EMAIL_DELAY_MS,
    hourlyLimit: workerConfig.MAX_EMAILS_PER_HOUR_PER_SENDER
  },
  'Starting ReachInbox Email Worker process...'
);

const worker = createEmailWorker();

// Start the continuous bounded outbox recovery loop
startOutboxRecoveryLoop().catch((err) => {
  logger.error({ err }, 'Fatal error in outbox recovery starter');
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown signal received. Shutting down worker...');

  try {
    // 1. Stop outbox recovery loop
    stopOutboxRecoveryLoop();

    // 2. Pause and close BullMQ worker (allows active jobs to finish or safely checkpoint)
    await worker.close();
    logger.info('BullMQ worker closed');

    // 3. Close queue events
    await queueEvents.close();
    logger.info('Queue events closed');

    // 4. Close SMTP connection pools
    emailSenderService.closeTransports();

    // 5. Disconnect Redis and MySQL
    await redis.quit();
    await prisma.$disconnect();
    logger.info('Database and Redis connections closed');

    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during worker graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
