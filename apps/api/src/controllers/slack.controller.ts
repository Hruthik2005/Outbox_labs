import { Request, Response, NextFunction } from 'express';
import { slackService } from '../services/slack.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export class SlackController {
  async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const { url, state } = slackService.getSlackConnectUrl(userId);
      sendSuccess(res, { url, state });
    } catch (err) {
      next(err);
    }
  }

  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        sendError(res, 'Missing code or state parameter', 400, 'INVALID_SLACK_CALLBACK');
        return;
      }

      await slackService.handleSlackCallback(code, state);

      if (req.headers.accept?.includes('application/json')) {
        sendSuccess(res, { message: 'Slack connected successfully' });
      } else {
        res.redirect(`${env.WEB_ORIGIN}/settings?slack=connected`);
      }
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const status = await slackService.getConnectionStatus(userId);
      sendSuccess(res, status);
    } catch (err) {
      next(err);
    }
  }

  async disconnect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const disconnected = await slackService.disconnect(userId);
      if (!disconnected) {
        sendError(res, 'No active Slack connection found', 404, 'NOT_FOUND');
        return;
      }
      sendSuccess(res, { message: 'Slack disconnected successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const slackController = new SlackController();
