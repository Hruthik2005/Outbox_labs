import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import { prisma, redis, workerConfig } from '../config/worker.config.js';
import { logger } from '../utils/logger.js';

function decrypt(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  const [ivHex, tagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = Buffer.from(workerConfig.ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key.length === 32 ? key : crypto.createHash('sha256').update(workerConfig.ENCRYPTION_KEY).digest(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export class SlackNotificationService {
  /**
   * Send rate limit reached alert to Slack with Redis-backed deduplication per window.
   */
  async notifyRateLimitReached(params: {
    userId: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    limit: number;
    windowKey: string;
    nextWindowTimestamp: number;
  }): Promise<boolean> {
    const dedupKey = `slack_alert:${params.senderId}:${params.windowKey}`;

    // Atomically check and claim notification right for this window (1 hour TTL)
    const claimed = await redis.set(dedupKey, '1', 'EX', workerConfig.RATE_LIMIT_WINDOW_SECONDS, 'NX');
    if (!claimed) {
      logger.debug({ senderId: params.senderId, windowKey: params.windowKey }, 'Slack alert already sent for this window (deduplicated)');
      return false;
    }

    // Retrieve user's Slack connection
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId: params.userId }
    });

    if (!slackConn) {
      logger.info({ userId: params.userId }, 'No Slack integration configured for user; skipping alert');
      return false;
    }

    try {
      const accessToken = decrypt(slackConn.encryptedAccessToken);
      const client = new WebClient(accessToken);
      const channel = slackConn.channelId || '#general';
      const resumeTime = new Date(params.nextWindowTimestamp).toISOString();

      const text = `⚠️ *Rate Limit Alert*: Sender *${params.senderName}* (<${params.senderEmail}>) has reached its configured limit of *${params.limit} emails/hour*. Remaining jobs have been safely rescheduled to resume at *${resumeTime}*.`;

      await client.chat.postMessage({
        channel,
        text,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ ReachInbox Rate Limit Reached',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n${params.senderName} (${params.senderEmail})`
              },
              {
                type: 'mrkdwn',
                text: `*Configured Limit:*\n${params.limit} emails/hour`
              },
              {
                type: 'mrkdwn',
                text: `*Time Reached:*\n${new Date().toLocaleTimeString()} UTC`
              },
              {
                type: 'mrkdwn',
                text: `*Rescheduled Window:*\n${resumeTime}`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'ℹ️ No emails were dropped. BullMQ delayed jobs are safely preserved in Redis.'
              }
            ]
          }
        ]
      });

      logger.info({ senderId: params.senderId, channel }, 'Sent rate-limit Slack notification');
      return true;
    } catch (error) {
      logger.warn({ error, userId: params.userId }, 'Failed to deliver Slack notification (continuing safely)');
      return false;
    }
  }
}

export const slackNotificationService = new SlackNotificationService();
