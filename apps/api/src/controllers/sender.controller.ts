import { Request, Response, NextFunction } from 'express';
import { senderService } from '../services/sender.service.js';
import { sendSuccess } from '../utils/response.js';
import { CreateSenderRequest, UpdateSenderRequest, TestSmtpRequest } from '@reachinbox/shared';

export class SenderController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const senders = await senderService.listSenders(userId);
      sendSuccess(res, senders);
    } catch (err) {
      next(err);
    }
  }

  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as TestSmtpRequest;
      const success = await senderService.testConnection(data);
      sendSuccess(res, { connected: success });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const data = req.body as CreateSenderRequest;
      const sender = await senderService.createSender(userId, data);
      sendSuccess(res, sender, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const id = req.params.id;
      const data = req.body as UpdateSenderRequest;
      const updated = await senderService.updateSender(userId, id, data);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const id = req.params.id;
      await senderService.deleteSender(userId, id);
      sendSuccess(res, { message: 'Sender removed successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const senderController = new SenderController();
