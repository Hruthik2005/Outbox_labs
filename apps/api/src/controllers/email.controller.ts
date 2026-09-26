import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ScheduleEmailRequest, EmailQueryParams } from '@reachinbox/shared';

export class EmailController {
  async schedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const data = req.body as ScheduleEmailRequest;
      const result = await emailService.scheduleEmails(userId, data);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const query = req.query as unknown as EmailQueryParams;
      const result = await emailService.getScheduledEmails(userId, {
        page: query.page,
        limit: query.limit,
        campaignId: query.campaignId
      });
      sendSuccess(res, result.items, 200, {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
        hasNextPage: (query.page || 1) * (query.limit || 20) < result.total
      });
    } catch (err) {
      next(err);
    }
  }

  async getSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const query = req.query as unknown as EmailQueryParams;
      const result = await emailService.getSentEmails(userId, {
        page: query.page,
        limit: query.limit,
        campaignId: query.campaignId,
        status: query.status
      });
      sendSuccess(res, result.items, 200, {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
        hasNextPage: (query.page || 1) * (query.limit || 20) < result.total
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const id = req.params.id;
      const email = await emailService.getEmailDetails(userId, id);
      if (!email) {
        sendError(res, 'Email not found', 404, 'NOT_FOUND');
        return;
      }
      sendSuccess(res, email);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const id = req.params.id;
      const cancelled = await emailService.cancelEmail(userId, id);
      if (!cancelled) {
        sendError(res, 'Email cannot be cancelled (not found, already sent or processing)', 400, 'CANNOT_CANCEL');
        return;
      }
      sendSuccess(res, { message: 'Email cancelled successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const metrics = await emailService.getDashboardMetrics(userId);
      sendSuccess(res, metrics);
    } catch (err) {
      next(err);
    }
  }
}

export const emailController = new EmailController();
