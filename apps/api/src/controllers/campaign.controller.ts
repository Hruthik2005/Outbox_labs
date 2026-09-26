import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service.js';
import { sendSuccess } from '../utils/response.js';

export class CampaignController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await campaignService.listCampaigns(userId, { page, limit });
      sendSuccess(res, result.items, 200, {
        total: result.total,
        page,
        limit,
        hasNextPage: page * limit < result.total
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const id = req.params.id;
      const campaign = await campaignService.getCampaignDetails(userId, id);
      sendSuccess(res, campaign);
    } catch (err) {
      next(err);
    }
  }
}

export const campaignController = new CampaignController();
