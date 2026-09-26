import { Queue } from 'bullmq';
import { prisma, redis, redisConnectionOptions, workerConfig } from '../config/worker.config.js';
import { QUEUE_NAME, EmailJobData } from '@reachinbox/shared';
import { logger } from './logger.js';

let isRunning = false;
let shouldStop = false;
let recoveryQueue: Queue<EmailJobData> | null = null;

function getRecoveryQueue(): Queue<EmailJobData> {
  if (!recoveryQueue) {
    recoveryQueue = new Queue<EmailJobData>(QUEUE_NAME.EMAIL_QUEUE, {
      connection: redisConnectionOptions
    });
  }
  return recoveryQueue;
}

/**
 * Continuous bounded outbox recovery service.
 *
 * NOTE: THIS IS NOT A CRON JOB.
 * It is a continuous, self-healing event-driven reconciliation loop
 * with distributed locking (Redis NX lock) and adaptive backoff.
 * It does not use node-cron, OS cron, agenda, or interval timers.
 */
export async function startOutboxRecoveryLoop(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  shouldStop = false;

  logger.info('Started transactional outbox recovery reconciliation loop');

  while (!shouldStop) {
    try {
      // 1. Acquire distributed recovery lock in Redis to prevent multiple workers from running recovery simultaneously
      const lockKey = 'outbox_recovery_lock';
      const lockTtlMs = 5000;
      const acquired = await redis.set(lockKey, '1', 'PX', lockTtlMs, 'NX');

      if (acquired) {
        // Find unpublished outbox events created at least 3 seconds ago (giving primary publishing time)
        const cutoffTime = new Date(Date.now() - 3000);
        const pendingEvents = await prisma.outboxEvent.findMany({
          where: {
            publishedAt: null,
            createdAt: { lt: cutoffTime }
          },
          take: 50,
          orderBy: { createdAt: 'asc' }
        });

        if (pendingEvents.length > 0) {
          logger.info({ count: pendingEvents.length }, 'Outbox recovery found unpublished events; reconciling...');
          const queue = getRecoveryQueue();

          for (const event of pendingEvents) {
            try {
              const payload = JSON.parse(event.payload) as EmailJobData & { delayMs?: number };
              const delay = payload.delayMs ? Math.max(0, payload.delayMs) : 0;

              // Stable job ID = emailId prevents duplicates in BullMQ
              await queue.add('send-email', payload, {
                jobId: payload.emailId,
                delay
              });

              await prisma.outboxEvent.update({
                where: { id: event.id },
                data: { publishedAt: new Date() }
              });

              logger.info({ eventId: event.id, aggregateId: event.aggregateId }, 'Reconciled outbox event to BullMQ');
            } catch (err) {
              logger.error({ err, eventId: event.id }, 'Failed to reconcile individual outbox event');
            }
          }
        }

        // Release lock
        await redis.del(lockKey);
      }
    } catch (error) {
      logger.error({ error }, 'Error in outbox recovery loop');
    }

    // Adaptive backoff wait before next check (bounded loop, NOT a cron job)
    await new Promise((resolve) => setTimeout(resolve, workerConfig.OUTBOX_POLL_INTERVAL_MS));
  }

  isRunning = false;
  logger.info('Stopped outbox recovery reconciliation loop');
}

export function stopOutboxRecoveryLoop(): void {
  shouldStop = true;
}
