import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { emailRepository } from '../repositories/email.repository.js';
import { senderRepository } from '../repositories/sender.repository.js';
import { addEmailJob, removeEmailJob } from '../queue/email.queue.js';
import { indexEmailDocument } from '../integrations/elasticsearch/elasticsearch.client.js';
import {
  ScheduleEmailRequest,
  EMAIL_STATUS,
  CAMPAIGN_STATUS,
  OUTBOX_EVENT_TYPE,
  EMAIL_EVENT_TYPE,
  EmailDto,
  EmailJobData
} from '@reachinbox/shared';
import { logger } from '../utils/logger.js';
import { slackService } from './slack.service.js';

export class EmailService {
  /**
   * Schedule emails for multiple recipients.
   * Uses MySQL transaction + Transactional Outbox pattern + BullMQ delayed jobs.
   */
  async scheduleEmails(userId: string, data: ScheduleEmailRequest) {
    // 1. Verify sender exists and belongs to user
    const sender = await senderRepository.findById(data.senderId, userId);
    if (!sender) {
      throw new Error('Sender not found or unauthorized');
    }
    if (!sender.isActive) {
      throw new Error('Selected sender is inactive');
    }

    const uniqueRecipients = Array.from(new Set(data.recipients.map((r) => r.trim().toLowerCase())));
    const startTime = new Date(data.startAt);
    const now = new Date();
    const baseDelayMs = Math.max(0, startTime.getTime() - now.getTime());
    const delayStepMs = data.minimumDelaySeconds * 1000;

    // 2. Execute transactional creation in MySQL
    const { campaign, emails, outboxEvents } = await prisma.$transaction(async (tx) => {
      // Create campaign
      const campaign = await tx.campaign.create({
        data: {
          userId,
          senderId: data.senderId,
          subject: data.subject,
          body: data.body,
          startAt: startTime,
          minimumDelaySeconds: data.minimumDelaySeconds,
          hourlyLimit: data.hourlyLimit,
          totalRecipients: uniqueRecipients.length,
          status: CAMPAIGN_STATUS.SCHEDULED
        }
      });

      // Prepare email records with staggered scheduledAt times and unique idempotency keys
      const emailRecords = uniqueRecipients.map((recipient, index) => {
        const emailId = crypto.randomUUID();
        const scheduledTime = new Date(startTime.getTime() + index * delayStepMs);
        const idempotencyKey = crypto
          .createHash('sha256')
          .update(`${campaign.id}:${recipient}:${scheduledTime.getTime()}`)
          .digest('hex');

        return {
          id: emailId,
          userId,
          campaignId: campaign.id,
          senderId: data.senderId,
          recipient,
          subject: data.subject,
          scheduledAt: scheduledTime,
          status: EMAIL_STATUS.SCHEDULED,
          idempotencyKey,
          bullJobId: emailId
        };
      });

      // Insert all emails in batch
      await tx.email.createMany({
        data: emailRecords
      });

      // Create outbox events for reliable BullMQ publishing
      const outboxData = emailRecords.map((e, index) => {
        const jobDelay = baseDelayMs + index * delayStepMs;
        const payload: EmailJobData = {
          emailId: e.id,
          campaignId: campaign.id,
          userId,
          senderId: data.senderId,
          recipient: e.recipient,
          subject: data.subject,
          body: data.body,
          idempotencyKey: e.idempotencyKey,
          attemptNumber: 0,
          scheduledAt: e.scheduledAt.toISOString()
        };

        return {
          id: crypto.randomUUID(),
          eventType: OUTBOX_EVENT_TYPE.EMAIL_SCHEDULE,
          aggregateId: e.id,
          payload: JSON.stringify({ ...payload, delayMs: jobDelay })
        };
      });

      await tx.outboxEvent.createMany({
        data: outboxData
      });

      return { campaign, emails: emailRecords, outboxEvents: outboxData };
    });

    // 3. Immediately publish to BullMQ queue and index in Elasticsearch
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const outbox = outboxEvents[i];
      const parsedPayload = JSON.parse(outbox.payload) as EmailJobData & { delayMs: number };

      try {
        await addEmailJob(parsedPayload, parsedPayload.delayMs);

        // Mark outbox event as published
        await prisma.outboxEvent.update({
          where: { id: outbox.id },
          data: { publishedAt: new Date() }
        });

        // Asynchronously index in Elasticsearch
        indexEmailDocument({
          id: email.id,
          userId,
          campaignId: campaign.id,
          senderId: data.senderId,
          senderEmail: sender.email,
          recipient: email.recipient,
          subject: email.subject,
          status: EMAIL_STATUS.SCHEDULED,
          scheduledAt: email.scheduledAt.toISOString(),
          sentAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch((err) => {
          logger.warn({ err, emailId: email.id }, 'Initial Elasticsearch indexing warning');
        });
      } catch (err) {
        logger.error({ err, emailId: email.id }, 'Queue publication failed, outbox recovery will retry');
      }
    }

    // Send Slack alert if workspace is connected
    slackService.notifyCampaignScheduled(userId, {
      campaignId: campaign.id,
      subject: data.subject,
      recipientCount: emails.length,
      senderName: sender.name,
      senderEmail: sender.email,
      startAt: campaign.startAt.toISOString()
    }).catch((err) => {
      logger.warn({ err }, 'Failed to send campaign schedule Slack notification');
    });

    return {
      campaignId: campaign.id,
      scheduledCount: emails.length,
      startAt: campaign.startAt.toISOString(),
      recipients: uniqueRecipients
    };
  }

  async getScheduledEmails(
    userId: string,
    options?: { page?: number; limit?: number; campaignId?: string }
  ): Promise<{ items: EmailDto[]; total: number }> {
    const result = await emailRepository.findScheduled(userId, options);
    const items = result.items.map((e) => this.mapToDto(e));
    return { items, total: result.total };
  }

  async getSentEmails(
    userId: string,
    options?: { page?: number; limit?: number; campaignId?: string; status?: string }
  ): Promise<{ items: EmailDto[]; total: number }> {
    const result = await emailRepository.findSent(userId, options);
    const items = result.items.map((e) => this.mapToDto(e));
    return { items, total: result.total };
  }

  async getEmailDetails(userId: string, emailId: string): Promise<EmailDto | null> {
    const email = await emailRepository.findById(emailId, userId);
    if (!email) return null;
    return this.mapToDto(email);
  }

  async cancelEmail(userId: string, emailId: string): Promise<boolean> {
    const cancelled = await emailRepository.cancelEmail(emailId, userId);
    if (!cancelled) return false;

    if (cancelled.bullJobId) {
      await removeEmailJob(cancelled.bullJobId);
    }
    return true;
  }

  async getDashboardMetrics(userId: string) {
    return emailRepository.getDashboardMetrics(userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDto(e: any): EmailDto {
    return {
      id: e.id,
      userId: e.userId,
      campaignId: e.campaignId,
      senderId: e.senderId,
      recipient: e.recipient,
      subject: e.subject,
      body: e.body || e.campaign?.body,
      scheduledAt: e.scheduledAt.toISOString(),
      sentAt: e.sentAt ? e.sentAt.toISOString() : null,
      status: e.status,
      idempotencyKey: e.idempotencyKey,
      bullJobId: e.bullJobId,
      attemptCount: e.attemptCount,
      lastError: e.lastError,
      providerMessageId: e.providerMessageId,
      etherealPreviewUrl: e.etherealPreviewUrl,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      sender: e.sender
        ? {
            id: e.sender.id,
            userId: e.sender.userId,
            name: e.sender.name,
            email: e.sender.email,
            host: e.sender.host,
            port: e.sender.port,
            hourlyLimit: e.sender.hourlyLimit,
            minimumDelaySeconds: e.sender.minimumDelaySeconds,
            isActive: e.sender.isActive,
            createdAt: e.sender.createdAt.toISOString(),
            updatedAt: e.sender.updatedAt.toISOString()
          }
        : undefined,
      campaign: e.campaign
        ? {
            id: e.campaign.id,
            userId: e.campaign.userId,
            senderId: e.campaign.senderId,
            subject: e.campaign.subject,
            body: e.campaign.body,
            startAt: e.campaign.startAt.toISOString(),
            minimumDelaySeconds: e.campaign.minimumDelaySeconds,
            hourlyLimit: e.campaign.hourlyLimit,
            totalRecipients: e.campaign.totalRecipients,
            status: e.campaign.status,
            createdAt: e.campaign.createdAt.toISOString(),
            updatedAt: e.campaign.updatedAt.toISOString()
          }
        : undefined
    };
  }
}

export const emailService = new EmailService();
