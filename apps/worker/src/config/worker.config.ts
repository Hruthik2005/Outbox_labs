import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Client } from '@elastic/elasticsearch';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const workerConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://reachinbox:reachinbox_secret@localhost:3306/reachinbox',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME || '',
  ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD || '',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  MIN_EMAIL_DELAY_MS: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10),
  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100', 10),
  RATE_LIMIT_WINDOW_SECONDS: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '3600', 10),
  OUTBOX_POLL_INTERVAL_MS: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '2000', 10),
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
};

export const prisma = new PrismaClient();

export const redisConnectionOptions = {
  host: workerConfig.REDIS_HOST,
  port: workerConfig.REDIS_PORT,
  password: workerConfig.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

export const redis = new Redis(redisConnectionOptions);

export const esClient = new Client({
  node: workerConfig.ELASTICSEARCH_URL,
  auth: workerConfig.ELASTICSEARCH_USERNAME && workerConfig.ELASTICSEARCH_PASSWORD
    ? {
        username: workerConfig.ELASTICSEARCH_USERNAME,
        password: workerConfig.ELASTICSEARCH_PASSWORD
      }
    : undefined,
  tls: { rejectUnauthorized: false }
});
