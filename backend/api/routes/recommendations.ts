import { Router, Request, Response, NextFunction } from 'express';
import { getOrGenerateRecommendation } from '../../services/recommendations/recommendationService';

export const recommendationsRouter = Router();

/**
 * GET /api/v1/recommendations/:recommendation_id
 * Document 14 §11 (CP-037). Advisory only — no execute endpoint.
 */
recommendationsRouter.get('/:recommendation_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recommendationId = req.params.recommendation_id;

    if (!/^REC-\d{4}$/.test(recommendationId)) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Recommendation with id '${recommendationId}' not found. IDs must conform to canonical REC-XXXX format (Doc 04 §3).`,
          details: [],
          correlation_id: req.headers['x-correlation-id'] || 'system',
        },
      });
      return;
    }

    const record = await getOrGenerateRecommendation(recommendationId);

    if (!record) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Recommendation with id '${recommendationId}' not found`,
          details: [],
          correlation_id: req.headers['x-correlation-id'] || 'system',
        },
      });
      return;
    }

    res.status(200).json(record);
  } catch (err) {
    next(err);
  }
});

export default recommendationsRouter;
