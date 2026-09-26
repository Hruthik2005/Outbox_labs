import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const transportPool = new Map<string, nodemailer.Transporter>();

export function getOrCreateTransport(config: SmtpConfig): nodemailer.Transporter {
  const key = `${config.host}:${config.port}:${config.auth.user}`;
  let transport = transportPool.get(key);
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10
    });
    transportPool.set(key, transport);
  }
  return transport;
}

export async function testSmtpConnection(config: SmtpConfig): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure || false,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    },
    connectionTimeout: 8000
  });

  try {
    await transporter.verify();
    logger.info({ host: config.host, user: config.auth.user }, 'SMTP connectivity verification successful');
    return true;
  } catch (error) {
    logger.error({ error, host: config.host }, 'SMTP verification failed');
    return false;
  }
}

export async function generateEtherealTestAccount(): Promise<{
  user: string;
  pass: string;
  smtp: { host: string; port: number; secure: boolean };
}> {
  const testAccount = await nodemailer.createTestAccount();
  return {
    user: testAccount.user,
    pass: testAccount.pass,
    smtp: testAccount.smtp
  };
}

export function closeAllTransports(): void {
  for (const [key, transport] of transportPool.entries()) {
    try {
      transport.close();
      logger.info({ key }, 'Closed SMTP transport pool');
    } catch (err) {
      logger.error({ err, key }, 'Error closing transport');
    }
  }
  transportPool.clear();
}
