import { QueueEvents } from 'bullmq';
import { QUEUE_NAME } from '@reachinbox/shared';
import { redisConnectionOptions } from '../config/worker.config.js';
import { logger } from '../utils/logger.js';

export const queueEvents = new QueueEvents(QUEUE_NAME.EMAIL_QUEUE, {
  connection: redisConnectionOptions
});

queueEvents.on('completed', ({ jobId }) => {
  logger.info({ jobId }, 'Queue event: Job completed successfully');
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Queue event: Job failed');
});

queueEvents.on('stalled', ({ jobId }) => {
  logger.warn({ jobId }, 'Queue event: Job stalled and will be re-processed');
});
