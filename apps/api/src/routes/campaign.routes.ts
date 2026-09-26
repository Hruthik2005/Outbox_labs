import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => campaignController.list(req, res, next));
router.get('/:id', (req, res, next) => campaignController.getById(req, res, next));

export default router;
