import { Router } from 'express';
import { emailController } from '../controllers/email.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { ScheduleEmailRequestSchema, EmailQuerySchema } from '@reachinbox/shared';

const router = Router();

router.use(requireAuth);

router.post('/schedule', validateBody(ScheduleEmailRequestSchema), (req, res, next) =>
  emailController.schedule(req, res, next)
);

router.get('/scheduled', validateQuery(EmailQuerySchema), (req, res, next) =>
  emailController.getScheduled(req, res, next)
);

router.get('/sent', validateQuery(EmailQuerySchema), (req, res, next) =>
  emailController.getSent(req, res, next)
);

router.get('/metrics', (req, res, next) =>
  emailController.getMetrics(req, res, next)
);

router.get('/:id', (req, res, next) =>
  emailController.getById(req, res, next)
);

router.post('/:id/cancel', (req, res, next) =>
  emailController.cancel(req, res, next)
);

export default router;
