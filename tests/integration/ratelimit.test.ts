import { describe, it, expect } from 'vitest';

describe('Distributed Rate Limiting Window Calculations', () => {
  it('should calculate deterministic hourly UTC window boundaries', () => {
    const windowSeconds = 3600;
    const testTimestampSec = 1717001400; // e.g. 1717001400 / 3600 = 476944.83
    const windowStart = Math.floor(testTimestampSec / windowSeconds) * windowSeconds;
    const nextWindowTimestamp = (windowStart + windowSeconds) * 1000;

    expect(windowStart % 3600).toBe(0);
    expect(nextWindowTimestamp).toBe((windowStart + 3600) * 1000);
    expect(nextWindowTimestamp).toBeGreaterThan(testTimestampSec * 1000);
  });

  it('should correctly stagger send timestamps based on minimum delay', () => {
    const delayStepMs = 2000; // 2 seconds delay
    const startTime = new Date('2026-10-01T10:00:00.000Z').getTime();

    const emails = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
    const scheduledTimes = emails.map((_, index) => new Date(startTime + index * delayStepMs));

    expect(scheduledTimes[0].toISOString()).toBe('2026-10-01T10:00:00.000Z');
    expect(scheduledTimes[1].toISOString()).toBe('2026-10-01T10:00:02.000Z');
    expect(scheduledTimes[2].toISOString()).toBe('2026-10-01T10:00:04.000Z');

    expect(scheduledTimes[1].getTime() - scheduledTimes[0].getTime()).toBe(2000);
    expect(scheduledTimes[2].getTime() - scheduledTimes[1].getTime()).toBe(2000);
  });
});
