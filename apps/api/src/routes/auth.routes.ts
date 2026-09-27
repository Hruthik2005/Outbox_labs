import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/google/url', (req, res, next) => authController.getGoogleUrl(req, res, next));
router.get('/google/callback', (req, res, next) => authController.handleGoogleCallback(req, res, next));
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
