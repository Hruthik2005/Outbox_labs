import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redisConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
};

export const redis = new Redis(redisConnectionOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch (error) {
    logger.error({ error }, 'Redis ping failed');
    return false;
  }
}
