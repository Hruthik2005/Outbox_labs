import { prisma } from '../config/worker.config.js';
import { EMAIL_STATUS, EMAIL_EVENT_TYPE } from '@reachinbox/shared';
import { logger } from '../utils/logger.js';

export class IdempotencyService {
  /**
   * Atomically acquire the processing lock for an email.
   * Prevents duplicate sends across parallel workers or retried jobs.
   */
  async acquireProcessingLock(emailId: string, bullJobId: string): Promise<boolean> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const email = await tx.email.findUnique({
          where: { id: emailId }
        });

        if (!email) {
          logger.warn({ emailId }, 'Email record not found in database');
          return false;
        }

        // If email was already sent or cancelled, abort immediately
        if (email.status === EMAIL_STATUS.SENT) {
          logger.warn({ emailId }, 'Email has already been sent; aborting to prevent duplicate delivery');
          return false;
        }

        if (email.status === EMAIL_STATUS.CANCELLED) {
          logger.info({ emailId }, 'Email was cancelled by user; aborting send');
          return false;
        }

        // Atomic transition to PROCESSING
        await tx.email.update({
          where: { id: emailId },
          data: {
            status: EMAIL_STATUS.PROCESSING,
            attemptCount: { increment: 1 },
            bullJobId
          }
        });

        await tx.emailEvent.create({
          data: {
            emailId,
            eventType: EMAIL_EVENT_TYPE.SEND_ATTEMPT,
            details: JSON.stringify({ bullJobId, timestamp: new Date().toISOString() })
          }
        });

        return true;
      });

      return result;
    } catch (error) {
      logger.error({ error, emailId }, 'Failed to acquire processing lock');
      return false;
    }
  }

  /**
   * Release lock and set status back to SCHEDULED or QUEUED if rate-limited or deferred.
   */
  async releaseLockForRescheduling(emailId: string, nextScheduledTime: Date, reason: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.email.update({
        where: { id: emailId },
        data: {
          status: EMAIL_STATUS.SCHEDULED,
          scheduledAt: nextScheduledTime,
          lastError: reason
        }
      });

      await tx.emailEvent.create({
        data: {
          emailId,
          eventType: EMAIL_EVENT_TYPE.RATE_LIMITED_RESCHEDULED,
          details: JSON.stringify({
            reason,
            rescheduledFor: nextScheduledTime.toISOString()
          })
        }
      });
    });
  }
}

export const idempotencyService = new IdempotencyService();
