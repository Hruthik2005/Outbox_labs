import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service.js';
import { sendSuccess } from '../utils/response.js';
import { SearchQueryParams } from '@reachinbox/shared';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const query = req.query as unknown as SearchQueryParams;
      const result = await searchService.searchEmails(userId, query);
      sendSuccess(res, result.items, 200, {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
        hasNextPage: (query.page || 1) * (query.limit || 20) < result.total
      });
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
