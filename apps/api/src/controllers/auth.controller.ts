import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export class AuthController {
  async getGoogleUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url, state } = authService.getGoogleLoginUrl();
      sendSuccess(res, { url, state });
    } catch (err) {
      next(err);
    }
  }

  async handleGoogleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        sendError(res, 'Missing code or state parameter', 400, 'INVALID_CALLBACK_PARAMS');
        return;
      }

      const { token, user } = await authService.handleGoogleCallback(code, state);

      res.cookie('reachinbox_session', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      if (req.headers.accept?.includes('application/json')) {
        sendSuccess(res, { token, user });
      } else {
        res.redirect(`${env.WEB_ORIGIN}/auth/callback?token=${token}`);
      }
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.userId) {
        sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
        return;
      }

      const profile = await authService.getProfile(req.userId);
      if (!profile) {
        sendError(res, 'User not found', 404, 'NOT_FOUND');
        return;
      }

      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('reachinbox_session');
    sendSuccess(res, { message: 'Logged out successfully' });
  }
}

export const authController = new AuthController();
