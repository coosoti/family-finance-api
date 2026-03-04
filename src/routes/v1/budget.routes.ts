import { Router } from 'express';
import { budgetController } from '../../controllers/v1/budget.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Budget categories
router.get('/categories', budgetController.getAll);
router.get('/categories/:id', budgetController.getById);
router.post('/categories', budgetController.create);
router.put('/categories/:id', budgetController.update);
router.delete('/categories/:id', budgetController.delete);

// Budget summary
router.get('/summary', budgetController.getSummary);
router.get('/summary/range', budgetController.getSummaryByRange);

// Recalculate budget with 50/30/20 rule
router.post('/recalculate', budgetController.recalculateBudget);

export default router;