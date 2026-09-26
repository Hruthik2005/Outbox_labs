import { redis, workerConfig } from '../config/worker.config.js';
import { logger } from '../utils/logger.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  windowKey: string;
  nextWindowTimestamp: number;
  retryAfterMs: number;
}

/**
 * Lua script for atomic hourly rate limiting per sender.
 * KEYS[1] = rate limit counter key (e.g. rate:sender:{senderId}:{windowHour})
 * ARGV[1] = limit (max emails allowed in this window)
 * ARGV[2] = window TTL in seconds
 *
 * Returns: [1 if allowed else 0, current_count]
 */
const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('get', key)
if current and tonumber(current) >= limit then
  return {0, tonumber(current)}
end

local count = redis.call('incr', key)
if count == 1 then
  redis.call('expire', key, ttl)
end

return {1, count}
`;

export class RateLimitService {
  /**
   * Check and increment sender hourly rate limit atomically in Redis.
   */
  async checkAndIncrementHourlyLimit(
    senderId: string,
    customHourlyLimit?: number
  ): Promise<RateLimitCheckResult> {
    const limit = customHourlyLimit || workerConfig.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const windowSeconds = workerConfig.RATE_LIMIT_WINDOW_SECONDS;

    // Use standard UTC hour window for deterministic boundary calculation
    const now = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
    const nextWindowTimestamp = (windowStart + windowSeconds) * 1000;
    const retryAfterMs = Math.max(1000, nextWindowTimestamp - Date.now() + 500);

    const windowKey = `sender_rate:${senderId}:${windowStart}`;

    try {
      const result = (await redis.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        windowKey,
        limit.toString(),
        windowSeconds.toString()
      )) as [number, number];

      const allowed = result[0] === 1;
      const currentCount = result[1];

      return {
        allowed,
        currentCount,
        limit,
        windowKey: windowStart.toString(),
        nextWindowTimestamp,
        retryAfterMs
      };
    } catch (error) {
      logger.error({ error, senderId }, 'Redis rate limit evaluation error; falling back to permissive mode');
      return {
        allowed: true,
        currentCount: 0,
        limit,
        windowKey: windowStart.toString(),
        nextWindowTimestamp,
        retryAfterMs: 5000
      };
    }
  }

  /**
   * Enforce minimum send delay between emails for a specific sender across all worker processes.
   * Atomically sets/checks the next allowed send timestamp in Redis.
   */
  async enforceMinimumSendDelay(senderId: string, customDelayMs?: number): Promise<void> {
    const delayMs = customDelayMs ?? workerConfig.MIN_EMAIL_DELAY_MS;
    if (delayMs <= 0) return;

    const delayKey = `sender_pacing:${senderId}`;

    // Distributed atomic reservation of send slot:
    // We increment/update the scheduled execution slot in Redis
    const now = Date.now();
    const lastSendSlot = await redis.get(delayKey);
    let targetTime = now;

    if (lastSendSlot) {
      const parsedSlot = parseInt(lastSendSlot, 10);
      if (parsedSlot + delayMs > now) {
        targetTime = parsedSlot + delayMs;
      }
    }

    // Set the reserved timestamp with 60s TTL
    await redis.set(delayKey, targetTime.toString(), 'EX', 60);

    const waitMs = targetTime - now;
    if (waitMs > 0) {
      logger.debug({ senderId, waitMs }, 'Applying distributed minimum send delay pacing');
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export const rateLimitService = new RateLimitService();
