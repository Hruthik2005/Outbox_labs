import { searchEmailsInElasticsearch } from '../integrations/elasticsearch/elasticsearch.client.js';
import { prisma } from '../config/database.js';
import { SearchQueryParams, EmailDto, EmailStatus } from '@reachinbox/shared';
import { logger } from '../utils/logger.js';

export class SearchService {
  async searchEmails(userId: string, params: SearchQueryParams) {
    try {
      const esResult = await searchEmailsInElasticsearch({
        userId,
        query: params.q,
        page: params.page,
        limit: params.limit
      });

      if (esResult.documents.length > 0 || esResult.total > 0) {
        return {
          source: 'elasticsearch',
          total: esResult.total,
          items: esResult.documents
        };
      }
    } catch (error) {
      logger.warn({ error }, 'Elasticsearch search failed, falling back to database query');
    }

    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          userId,
          OR: [
            { recipient: { contains: params.q } },
            { subject: { contains: params.q } },
            { status: { contains: params.q } }
          ]
        },
        skip,
        take: params.limit,
        orderBy: { scheduledAt: 'desc' },
        include: { sender: true, campaign: true }
      }),
      prisma.email.count({
        where: {
          userId,
          OR: [
            { recipient: { contains: params.q } },
            { subject: { contains: params.q } },
            { status: { contains: params.q } }
          ]
        }
      })
    ]);

    const mappedItems: EmailDto[] = items.map((e) => ({
      id: e.id,
      userId: e.userId,
      campaignId: e.campaignId,
      senderId: e.senderId,
      recipient: e.recipient,
      subject: e.subject,
      scheduledAt: e.scheduledAt.toISOString(),
      sentAt: e.sentAt ? e.sentAt.toISOString() : null,
      status: e.status as EmailStatus,
      idempotencyKey: e.idempotencyKey,
      bullJobId: e.bullJobId,
      attemptCount: e.attemptCount,
      lastError: e.lastError,
      providerMessageId: e.providerMessageId,
      etherealPreviewUrl: e.etherealPreviewUrl,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString()
    }));

    return {
      source: 'database',
      total,
      items: mappedItems
    };
  }
}

export const searchService = new SearchService();
