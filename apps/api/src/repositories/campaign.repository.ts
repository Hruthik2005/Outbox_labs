import { prisma } from '../config/database.js';
import { Campaign, Prisma } from '@prisma/client';

export class CampaignRepository {
  async findById(id: string, userId?: string): Promise<Campaign | null> {
    return prisma.campaign.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {})
      },
      include: {
        sender: true
      }
    });
  }

  async findByUserId(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ items: Campaign[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: true }
      }),
      prisma.campaign.count({ where: { userId } })
    ]);

    return { items, total };
  }

  async create(data: Prisma.CampaignCreateInput): Promise<Campaign> {
    return prisma.campaign.create({ data });
  }

  async updateStatus(id: string, status: string): Promise<Campaign> {
    return prisma.campaign.update({
      where: { id },
      data: { status }
    });
  }
}

export const campaignRepository = new CampaignRepository();
