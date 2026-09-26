import { campaignRepository } from '../repositories/campaign.repository.js';
import { prisma } from '../config/database.js';
import { CampaignDto, CampaignStatus } from '@reachinbox/shared';

export class CampaignService {
  async listCampaigns(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ items: CampaignDto[]; total: number }> {
    const result = await campaignRepository.findByUserId(userId, options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: CampaignDto[] = result.items.map((c: any) => ({
      id: c.id,
      userId: c.userId,
      senderId: c.senderId,
      subject: c.subject,
      body: c.body,
      startAt: c.startAt.toISOString(),
      minimumDelaySeconds: c.minimumDelaySeconds,
      hourlyLimit: c.hourlyLimit,
      totalRecipients: c.totalRecipients,
      status: c.status as CampaignStatus,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      sender: c.sender
        ? {
            id: c.sender.id,
            userId: c.sender.userId,
            name: c.sender.name,
            email: c.sender.email,
            host: c.sender.host,
            port: c.sender.port,
            hourlyLimit: c.sender.hourlyLimit,
            minimumDelaySeconds: c.sender.minimumDelaySeconds,
            isActive: c.sender.isActive,
            createdAt: c.sender.createdAt.toISOString(),
            updatedAt: c.sender.updatedAt.toISOString()
          }
        : undefined
    }));

    return { items, total: result.total };
  }

  async getCampaignDetails(userId: string, campaignId: string) {
    const campaign = await campaignRepository.findById(campaignId, userId);
    if (!campaign) {
      throw new Error('Campaign not found or unauthorized');
    }

    const counts = await prisma.email.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { id: true }
    });

    const statusCounts: Record<string, number> = {};
    for (const c of counts) {
      statusCounts[c.status] = c._count.id;
    }

    return {
      campaign: {
        id: campaign.id,
        userId: campaign.userId,
        senderId: campaign.senderId,
        subject: campaign.subject,
        body: campaign.body,
        startAt: campaign.startAt.toISOString(),
        minimumDelaySeconds: campaign.minimumDelaySeconds,
        hourlyLimit: campaign.hourlyLimit,
        totalRecipients: campaign.totalRecipients,
        status: campaign.status,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString()
      },
      counts: statusCounts
    };
  }
}

export const campaignService = new CampaignService();
