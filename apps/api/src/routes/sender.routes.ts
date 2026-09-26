import { Router } from 'express';
import { senderController } from '../controllers/sender.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { CreateSenderSchema, UpdateSenderSchema, TestSmtpSchema } from '@reachinbox/shared';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => senderController.list(req, res, next));
router.post('/test', validateBody(TestSmtpSchema), (req, res, next) =>
  senderController.testConnection(req, res, next)
);
router.post('/', validateBody(CreateSenderSchema), (req, res, next) =>
  senderController.create(req, res, next)
);
router.patch('/:id', validateBody(UpdateSenderSchema), (req, res, next) =>
  senderController.update(req, res, next)
);
router.delete('/:id', (req, res, next) =>
  senderController.delete(req, res, next)
);

export default router;
