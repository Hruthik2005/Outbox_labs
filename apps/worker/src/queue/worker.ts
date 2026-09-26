import { Worker } from 'bullmq';
import { QUEUE_NAME, EmailJobData, EmailJobResult } from '@reachinbox/shared';
import { redisConnectionOptions, workerConfig } from '../config/worker.config.js';
import { processEmailJob } from '../processors/email.processor.js';
import { logger } from '../utils/logger.js';

export function createEmailWorker(): Worker<EmailJobData, EmailJobResult> {
  const worker = new Worker<EmailJobData, EmailJobResult>(
    QUEUE_NAME.EMAIL_QUEUE,
    async (job) => {
      return processEmailJob(job);
    },
    {
      connection: redisConnectionOptions,
      concurrency: workerConfig.WORKER_CONCURRENCY,
      lockDuration: 30000,
      stalledInterval: 30000
    }
  );

  worker.on('active', (job) => {
    logger.info({ jobId: job.id, emailId: job.data.emailId }, 'Worker started processing job');
  });

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, success: result.success }, 'Worker finished processing job');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Worker failed processing job');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker system error');
  });

  return worker;
}
