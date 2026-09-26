import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateQuery } from '../middleware/validation.middleware.js';
import { SearchQuerySchema } from '@reachinbox/shared';

const router = Router();

router.use(requireAuth);

router.get('/emails', validateQuery(SearchQuerySchema), (req, res, next) =>
  searchController.search(req, res, next)
);

export default router;
