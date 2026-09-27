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
    const dedupKey = `slack_alert:${params.senderId}:${params.limit}:${params.windowKey}`;

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
      const resumeTime = new Date(params.nextWindowTimestamp).toLocaleTimeString();
      const text = `⚠️ *Rate Limit Reached*: Sender *${params.senderName}* reached limit of *${params.limit} email(s)/hour*. Remaining jobs rescheduled to resume at *${resumeTime}*.`;

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *Hourly Rate Limit Reached*\n*Sender:* ${params.senderName} (${params.senderEmail})\n*Configured Limit:* ${params.limit} email(s)/hour\n*Status:* Remaining jobs rescheduled safely to resume at *${resumeTime}* (No emails dropped)`
          }
        }
      ];

      if (accessToken.startsWith('http')) {
        await fetch(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, blocks })
        });
      } else {
        const client = new WebClient(accessToken);
        const channel = slackConn.channelId || '#reachinbox-alerts';
        await client.chat.postMessage({
          channel,
          text,
          blocks: blocks as never
        });
      }

      logger.info({ senderId: params.senderId }, 'Sent rate-limit Slack notification');
      return true;
    } catch (error) {
      logger.warn({ error, userId: params.userId }, 'Failed to deliver Slack notification (continuing safely)');
      return false;
    }
  }

  /**
   * Send notification to Slack when an email is successfully dispatched via SMTP.
   */
  async notifyEmailSent(params: {
    userId: string;
    recipient: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    previewUrl?: string;
  }): Promise<boolean> {
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId: params.userId }
    });

    if (!slackConn) return false;

    try {
      const accessToken = decrypt(slackConn.encryptedAccessToken);
      const text = `✉️ Email delivered to *${params.recipient}* - "${params.subject}"`;
      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✉️ *Email Delivered Successfully*\n*To:* \`${params.recipient}\`\n*Subject:* ${params.subject}\n*From:* ${params.senderName} (${params.senderEmail})`
          }
        }
      ];

      if (params.previewUrl) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Ethereal Preview ↗',
                emoji: true
              },
              url: params.previewUrl
            }
          ]
        });
      }

      if (accessToken.startsWith('http')) {
        await fetch(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, blocks })
        });
      } else {
        const client = new WebClient(accessToken);
        const channel = slackConn.channelId || '#reachinbox-alerts';
        await client.chat.postMessage({
          channel,
          text,
          blocks: blocks as never
        });
      }

      logger.info({ recipient: params.recipient }, 'Sent email delivery Slack notification');
      return true;
    } catch (error) {
      logger.warn({ error, userId: params.userId }, 'Failed to deliver email sent Slack notification');
      return false;
    }
  }

  /**
   * Send notification to Slack when an email send fails.
   */
  async notifyEmailFailed(params: {
    userId: string;
    recipient: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    error: string;
  }): Promise<boolean> {
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId: params.userId }
    });

    if (!slackConn) return false;

    try {
      const accessToken = decrypt(slackConn.encryptedAccessToken);
      const text = `❌ Email delivery failed for *${params.recipient}* - "${params.subject}"`;
      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ *Email Delivery Failed*\n*To:* \`${params.recipient}\`\n*Subject:* ${params.subject}\n*From:* ${params.senderName} (${params.senderEmail})\n*Error:* \`${params.error}\``
          }
        }
      ];

      if (accessToken.startsWith('http')) {
        await fetch(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, blocks })
        });
      } else {
        const client = new WebClient(accessToken);
        const channel = slackConn.channelId || '#reachinbox-alerts';
        await client.chat.postMessage({
          channel,
          text,
          blocks: blocks as never
        });
      }

      logger.info({ recipient: params.recipient, error: params.error }, 'Sent email failure Slack notification');
      return true;
    } catch (error) {
      logger.warn({ error, userId: params.userId }, 'Failed to deliver email failure Slack notification');
      return false;
    }
  }
}

export const slackNotificationService = new SlackNotificationService();
