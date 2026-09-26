import { Job, Queue } from 'bullmq';
import { EmailJobData, EmailJobResult, EMAIL_STATUS, QUEUE_NAME } from '@reachinbox/shared';
import { prisma, redisConnectionOptions } from '../config/worker.config.js';
import { idempotencyService } from '../services/idempotency.service.js';
import { rateLimitService } from '../services/rate-limit.service.js';
import { emailSenderService } from '../services/email-sender.service.js';
import { slackNotificationService } from '../services/slack-notification.service.js';
import { emailIndexingService } from '../services/email-indexing.service.js';
import { logger } from '../utils/logger.js';

// Lazy-loaded queue reference for rescheduling
let emailQueue: Queue<EmailJobData> | null = null;
function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData>(QUEUE_NAME.EMAIL_QUEUE, {
      connection: redisConnectionOptions
    });
  }
  return emailQueue;
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
  const data = job.data;
  const jobId = job.id || data.emailId;

  logger.info({ emailId: data.emailId, recipient: data.recipient, jobId }, 'Processing email job');

  // 1. Acquire atomic processing lock in MySQL to guarantee idempotency
  const lockAcquired = await idempotencyService.acquireProcessingLock(data.emailId, jobId);
  if (!lockAcquired) {
    logger.warn({ emailId: data.emailId }, 'Could not acquire lock or email is already processed/cancelled');
    return {
      success: false,
      emailId: data.emailId,
      error: 'Lock not acquired or already processed'
    };
  }

  // 2. Lookup sender configuration
  const sender = await prisma.sender.findUnique({
    where: { id: data.senderId }
  });

  if (!sender) {
    logger.error({ senderId: data.senderId }, 'Sender not found');
    await prisma.email.update({
      where: { id: data.emailId },
      data: { status: EMAIL_STATUS.FAILED, lastError: 'Configured sender was not found' }
    });
    return { success: false, emailId: data.emailId, error: 'Sender not found' };
  }

  // 3. Enforce distributed minimum send delay interval for this sender
  await rateLimitService.enforceMinimumSendDelay(
    sender.id,
    sender.minimumDelaySeconds * 1000
  );

  // 4. Check Redis-backed distributed hourly rate limit
  const rateLimit = await rateLimitService.checkAndIncrementHourlyLimit(
    sender.id,
    sender.hourlyLimit
  );

  // If rate limit has been reached: SAFE RESCHEDULING
  if (!rateLimit.allowed) {
    const nextWindow = new Date(rateLimit.nextWindowTimestamp);
    logger.warn(
      {
        senderId: sender.id,
        limit: rateLimit.limit,
        currentCount: rateLimit.currentCount,
        nextWindow: nextWindow.toISOString()
      },
      'Sender hourly rate limit reached; rescheduling job safely to next window'
    );

    // Release lock in MySQL and set scheduledAt to next window
    await idempotencyService.releaseLockForRescheduling(
      data.emailId,
      nextWindow,
      `Hourly limit of ${rateLimit.limit} reached for sender ${sender.name}`
    );

    // Trigger deduplicated Slack alert
    await slackNotificationService.notifyRateLimitReached({
      userId: data.userId,
      senderId: sender.id,
      senderName: sender.name,
      senderEmail: sender.email,
      limit: rateLimit.limit,
      windowKey: rateLimit.windowKey,
      nextWindowTimestamp: rateLimit.nextWindowTimestamp
    });

    // Reschedule in BullMQ with delay to next window
    const queue = getEmailQueue();
    const delay = Math.max(1000, rateLimit.retryAfterMs);

    // Re-add to BullMQ with identical stable jobId
    await queue.add(job.name, {
      ...data,
      attemptNumber: data.attemptNumber + 1,
      scheduledAt: nextWindow.toISOString()
    }, {
      jobId: data.emailId,
      delay
    });

    return {
      success: false,
      emailId: data.emailId,
      rescheduled: true,
      rescheduledFor: nextWindow.toISOString()
    };
  }

  // 5. Send Email via SMTP
  const sendResult = await emailSenderService.sendEmail({
    emailId: data.emailId,
    senderId: sender.id,
    recipient: data.recipient,
    subject: data.subject,
    body: data.body
  });

  // 6. Update status in Elasticsearch
  const finalStatus = sendResult.success ? EMAIL_STATUS.SENT : EMAIL_STATUS.FAILED;
  await emailIndexingService.updateStatus(
    data.emailId,
    finalStatus,
    sendResult.success ? new Date().toISOString() : null
  );

  return {
    success: sendResult.success,
    emailId: data.emailId,
    providerMessageId: sendResult.messageId,
    previewUrl: sendResult.previewUrl,
    error: sendResult.error
  };
}
