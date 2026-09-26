import { esClient } from '../../config/elasticsearch.js';
import { ELASTICSEARCH_INDEX, ElasticsearchEmailDocument } from '@reachinbox/shared';
import { logger } from '../../utils/logger.js';

export async function indexEmailDocument(doc: ElasticsearchEmailDocument): Promise<boolean> {
  try {
    await esClient.index({
      index: ELASTICSEARCH_INDEX.EMAILS,
      id: doc.id,
      document: doc,
      refresh: 'wait_for'
    });
    return true;
  } catch (error) {
    logger.error({ error, id: doc.id }, 'Elasticsearch indexDocument error');
    return false;
  }
}

export async function updateEmailDocumentStatus(
  id: string,
  status: string,
  sentAt?: string | null
): Promise<boolean> {
  try {
    await esClient.update({
      index: ELASTICSEARCH_INDEX.EMAILS,
      id,
      doc: {
        status,
        sentAt,
        updatedAt: new Date().toISOString()
      },
      refresh: 'wait_for'
    });
    return true;
  } catch (error) {
    logger.warn({ error, id }, 'Elasticsearch updateDocumentStatus warning');
    return false;
  }
}

export interface SearchEmailParams {
  userId: string;
  query: string;
  page?: number;
  limit?: number;
}

export async function searchEmailsInElasticsearch({
  userId,
  query,
  page = 1,
  limit = 20
}: SearchEmailParams): Promise<{ total: number; documents: ElasticsearchEmailDocument[] }> {
  try {
    const from = (page - 1) * limit;

    const response = await esClient.search<ElasticsearchEmailDocument>({
      index: ELASTICSEARCH_INDEX.EMAILS,
      from,
      size: limit,
      query: {
        bool: {
          must: [
            { term: { userId } },
            {
              multi_match: {
                query,
                fields: ['recipient^3', 'subject^2', 'senderEmail', 'status'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      },
      sort: [{ scheduledAt: { order: 'desc' } }]
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value || 0;

    const documents = response.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is ElasticsearchEmailDocument => doc !== undefined);

    return { total, documents };
  } catch (error) {
    logger.error({ error, query, userId }, 'Elasticsearch search error');
    return { total: 0, documents: [] };
  }
}
