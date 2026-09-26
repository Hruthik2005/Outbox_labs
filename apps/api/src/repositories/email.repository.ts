import { prisma } from '../config/database.js';
import { Email, Prisma } from '@prisma/client';
import { EMAIL_STATUS } from '@reachinbox/shared';

export class EmailRepository {
  async findById(id: string, userId?: string): Promise<Email | null> {
    return prisma.email.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {})
      },
      include: {
        sender: true,
        campaign: true,
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async findScheduled(
    userId: string,
    options?: { page?: number; limit?: number; campaignId?: string }
  ): Promise<{ items: Email[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailWhereInput = {
      userId,
      status: {
        in: [EMAIL_STATUS.SCHEDULED, EMAIL_STATUS.QUEUED, EMAIL_STATUS.PROCESSING]
      },
      ...(options?.campaignId ? { campaignId: options.campaignId } : {})
    };

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: { sender: true, campaign: true }
      }),
      prisma.email.count({ where })
    ]);

    return { items, total };
  }

  async findSent(
    userId: string,
    options?: { page?: number; limit?: number; campaignId?: string; status?: string }
  ): Promise<{ items: Email[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailWhereInput = {
      userId,
      status: options?.status
        ? options.status
        : { in: [EMAIL_STATUS.SENT, EMAIL_STATUS.FAILED] },
      ...(options?.campaignId ? { campaignId: options.campaignId } : {})
    };

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { sender: true, campaign: true }
      }),
      prisma.email.count({ where })
    ]);

    return { items, total };
  }

  async getDashboardMetrics(userId: string) {
    const [scheduled, sent, failed, processing, activeSendersCount, slackConnection] =
      await Promise.all([
        prisma.email.count({
          where: { userId, status: { in: [EMAIL_STATUS.SCHEDULED, EMAIL_STATUS.QUEUED] } }
        }),
        prisma.email.count({
          where: { userId, status: EMAIL_STATUS.SENT }
        }),
        prisma.email.count({
          where: { userId, status: EMAIL_STATUS.FAILED }
        }),
        prisma.email.count({
          where: { userId, status: EMAIL_STATUS.PROCESSING }
        }),
        prisma.sender.count({
          where: { userId, isActive: true }
        }),
        prisma.slackConnection.findUnique({
          where: { userId }
        })
      ]);

    return {
      totalScheduled: scheduled,
      totalSent: sent,
      totalFailed: failed,
      totalProcessing: processing,
      activeSendersCount,
      slackConnected: !!slackConnection
    };
  }

  async cancelEmail(id: string, userId: string): Promise<Email | null> {
    const email = await prisma.email.findFirst({
      where: {
        id,
        userId,
        status: { in: [EMAIL_STATUS.SCHEDULED, EMAIL_STATUS.QUEUED] }
      }
    });

    if (!email) return null;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.email.update({
        where: { id },
        data: { status: EMAIL_STATUS.CANCELLED }
      });

      await tx.emailEvent.create({
        data: {
          emailId: id,
          eventType: EMAIL_STATUS.CANCELLED,
          details: JSON.stringify({ reason: 'Cancelled by user request' })
        }
      });

      await tx.outboxEvent.create({
        data: {
          eventType: 'EMAIL_CANCEL',
          aggregateId: id,
          payload: JSON.stringify({ emailId: id, bullJobId: email.bullJobId })
        }
      });

      return updated;
    });
  }
}

export const emailRepository = new EmailRepository();
