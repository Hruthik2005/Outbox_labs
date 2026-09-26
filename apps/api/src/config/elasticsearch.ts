import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { ELASTICSEARCH_INDEX } from '@reachinbox/shared';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  auth: env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD
    ? {
        username: env.ELASTICSEARCH_USERNAME,
        password: env.ELASTICSEARCH_PASSWORD
      }
    : undefined,
  tls: {
    rejectUnauthorized: false
  }
});

export async function checkElasticsearchConnection(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    return ['green', 'yellow'].includes(health.status);
  } catch (error) {
    logger.warn({ error }, 'Elasticsearch health check failed');
    return false;
  }
}

export async function initializeElasticsearchIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: ELASTICSEARCH_INDEX.EMAILS });
    if (!exists) {
      await esClient.indices.create({
        index: ELASTICSEARCH_INDEX.EMAILS,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'uax_url_email',
                  filter: ['lowercase']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'text', analyzer: 'email_analyzer', fields: { keyword: { type: 'keyword' } } },
              recipient: { type: 'text', analyzer: 'email_analyzer', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      logger.info(`Elasticsearch index '${ELASTICSEARCH_INDEX.EMAILS}' created successfully.`);
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to initialize Elasticsearch index (will retry on next startup or sync)');
  }
}
