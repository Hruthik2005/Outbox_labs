import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/dist/queueAdapters/bullMQ.js';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env.js';
import { emailQueue } from './queue/email.queue.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import senderRoutes from './routes/sender.routes.js';
import slackRoutes from './routes/slack.routes.js';
import searchRoutes from './routes/search.routes.js';
import healthRoutes from './routes/health.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(
    cors({
      origin: [env.WEB_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-admin-key']
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestIdMiddleware);

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter
  });

  const protectBullBoard = (req: Request, res: Response, next: NextFunction): void => {
    const adminKey = req.headers['x-admin-key'] || req.query.key;
    if (adminKey === env.ADMIN_SECRET_KEY || env.NODE_ENV === 'development') {
      next();
      return;
    }
    res.status(401).send('Unauthorized: Admin access key required to view BullMQ Dashboard');
  };

  app.use('/admin/queues', protectBullBoard, serverAdapter.getRouter());

  app.get('/', (_req, res) => {
    res.json({
      name: 'ReachInbox Email Job Scheduler API',
      status: 'UP',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        emails: '/api/emails',
        bullBoard: '/admin/queues',
        frontend: env.WEB_ORIGIN
      }
    });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/senders', senderRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/search', searchRoutes);

  app.use(errorHandler);

  return app;
}
