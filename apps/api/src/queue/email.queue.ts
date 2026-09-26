import { Queue, JobsOptions } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
import { EMAIL_QUEUE_NAME, JOB_NAMES } from './queue.constants.js';
import { EmailJobData } from '@reachinbox/shared';
import { logger } from '../utils/logger.js';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    removeOnComplete: {
      age: 86400, // keep for 24 hours
      count: 10000
    },
    removeOnFail: {
      age: 7 * 86400, // keep failed for 7 days
      count: 50000
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

/**
 * Add a delayed email sending job to BullMQ.
 * Stable Job ID is emailId, preventing duplicate scheduling in BullMQ.
 */
export async function addEmailJob(
  data: EmailJobData,
  delayMs: number
): Promise<string> {
  const options: JobsOptions = {
    jobId: data.emailId,
    delay: Math.max(0, delayMs)
  };

  const job = await emailQueue.add(JOB_NAMES.SEND_EMAIL, data, options);
  logger.info({ jobId: job.id, emailId: data.emailId, delayMs }, 'Added email job to BullMQ');
  return job.id!;
}

/**
 * Cancel/remove a job from BullMQ if it has not yet completed.
 */
export async function removeEmailJob(jobId: string): Promise<boolean> {
  try {
    const job = await emailQueue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      if (state === 'delayed' || state === 'waiting') {
        await job.remove();
        logger.info({ jobId }, 'Removed job from BullMQ queue');
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error({ error, jobId }, 'Failed to remove job from BullMQ');
    return false;
  }
}
