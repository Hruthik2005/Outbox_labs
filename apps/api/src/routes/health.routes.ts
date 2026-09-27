import { Router } from 'express';
import { checkDatabaseConnection } from '../config/database.js';
import { checkRedisConnection } from '../config/redis.js';
import { checkElasticsearchConnection } from '../config/elasticsearch.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [database, redis, elasticsearch] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
    checkElasticsearchConnection()
  ]);

  const healthy = database && redis;

  const status = {
    status: healthy ? 'UP' : 'DOWN',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: database ? 'UP' : 'DOWN',
      redis: redis ? 'UP' : 'DOWN',
      elasticsearch: elasticsearch ? 'UP' : 'DOWN'
    }
  };

  res.status(healthy ? 200 : 503);
  sendSuccess(res, status, healthy ? 200 : 503);
});

router.get('/queue', async (_req, res) => {
  try {
    const { getQueueMetrics } = await import('../queue/email.queue.js');
    const metrics = await getQueueMetrics();
    sendSuccess(res, {
      queueName: 'email-scheduler-queue',
      ...metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: { message: errorMsg } });
  }
});

export default router;
