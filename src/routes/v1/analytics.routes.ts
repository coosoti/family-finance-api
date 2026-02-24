import { Router } from 'express';
import { analyticsController } from '../../controllers/v1/analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/overview', analyticsController.getOverview);
router.get('/trends', analyticsController.getSpendingTrends);
router.get('/categories', analyticsController.getCategoryBreakdown);

export default router;