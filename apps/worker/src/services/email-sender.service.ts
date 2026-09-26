import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma, workerConfig } from '../config/worker.config.js';
import { logger } from '../utils/logger.js';
import { EMAIL_STATUS, EMAIL_EVENT_TYPE } from '@reachinbox/shared';

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

const transportPool = new Map<string, nodemailer.Transporter>();

export class EmailSenderService {
  /**
   * Send the email via Nodemailer SMTP.
   * Updates database record with outcome and preview URL.
   */
  async sendEmail(params: {
    emailId: string;
    senderId: string;
    recipient: string;
    subject: string;
    body: string;
  }): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
    const sender = await prisma.sender.findUnique({
      where: { id: params.senderId }
    });

    if (!sender) {
      throw new Error(`Sender ${params.senderId} not found`);
    }

    const username = decrypt(sender.encryptedUsername);
    const password = decrypt(sender.encryptedPassword);

    const poolKey = `${sender.host}:${sender.port}:${username}`;
    let transporter = transportPool.get(poolKey);

    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: sender.host,
        port: sender.port,
        secure: sender.secure,
        auth: {
          user: username,
          pass: password
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });
      transportPool.set(poolKey, transporter);
    }

    try {
      const info = await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        to: params.recipient,
        subject: params.subject,
        html: params.body.includes('<') ? params.body : `<p>${params.body.replace(/\n/g, '<br/>')}</p>`,
        text: params.body
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      const messageId = info.messageId;

      // Update email status to SENT in MySQL
      await prisma.$transaction(async (tx) => {
        await tx.email.update({
          where: { id: params.emailId },
          data: {
            status: EMAIL_STATUS.SENT,
            sentAt: new Date(),
            providerMessageId: messageId,
            etherealPreviewUrl: previewUrl,
            lastError: null
          }
        });

        await tx.emailEvent.create({
          data: {
            emailId: params.emailId,
            eventType: EMAIL_EVENT_TYPE.SENT,
            details: JSON.stringify({ messageId, previewUrl, response: info.response })
          }
        });
      });

      logger.info(
        { emailId: params.emailId, recipient: params.recipient, messageId, previewUrl },
        'Email successfully delivered via SMTP'
      );

      return { success: true, messageId, previewUrl };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error, emailId: params.emailId }, 'SMTP send failure');

      // Ambiguous outcome handling: if connection dropped after sending DATA, mark as UNKNOWN_RECONCILE
      const isAmbiguous =
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('socket hang up');

      const nextStatus = isAmbiguous ? EMAIL_STATUS.UNKNOWN_RECONCILE : EMAIL_STATUS.FAILED;

      await prisma.$transaction(async (tx) => {
        await tx.email.update({
          where: { id: params.emailId },
          data: {
            status: nextStatus,
            lastError: errorMessage
          }
        });

        await tx.emailEvent.create({
          data: {
            emailId: params.emailId,
            eventType: EMAIL_EVENT_TYPE.FAILED,
            details: JSON.stringify({ error: errorMessage, isAmbiguous })
          }
        });
      });

      return { success: false, error: errorMessage };
    }
  }

  closeTransports(): void {
    for (const [key, transport] of transportPool.entries()) {
      transport.close();
      logger.info({ key }, 'Closed worker SMTP transport pool');
    }
    transportPool.clear();
  }
}

export const emailSenderService = new EmailSenderService();
