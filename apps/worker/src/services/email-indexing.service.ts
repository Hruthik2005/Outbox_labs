import { esClient } from '../config/worker.config.js';
import { ELASTICSEARCH_INDEX } from '@reachinbox/shared';
import { logger } from '../utils/logger.js';

export class EmailIndexingService {
  async updateStatus(emailId: string, status: string, sentAt?: string | null): Promise<void> {
    try {
      await esClient.update({
        index: ELASTICSEARCH_INDEX.EMAILS,
        id: emailId,
        doc: {
          status,
          sentAt: sentAt || undefined,
          updatedAt: new Date().toISOString()
        }
      });
      logger.debug({ emailId, status }, 'Updated email status in Elasticsearch');
    } catch (error) {
      logger.warn({ error, emailId }, 'Elasticsearch update document warning (Elasticsearch might be indexing asynchronously)');
    }
  }
}

export const emailIndexingService = new EmailIndexingService();
