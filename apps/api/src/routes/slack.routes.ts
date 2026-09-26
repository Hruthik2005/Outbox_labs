import { Router } from 'express';
import { slackController } from '../controllers/slack.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/connect', requireAuth, (req, res, next) => slackController.connect(req, res, next));
router.get('/callback', (req, res, next) => slackController.callback(req, res, next));
router.get('/status', requireAuth, (req, res, next) => slackController.getStatus(req, res, next));
router.post('/disconnect', requireAuth, (req, res, next) => slackController.disconnect(req, res, next));

export default router;
