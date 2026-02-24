import { Router } from 'express';
import { budgetController } from '../../controllers/v1/budget.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/categories', budgetController.getAll);
router.get('/categories/:id', budgetController.getById);
router.post('/categories', budgetController.create);
router.put('/categories/:id', budgetController.update);
router.delete('/categories/:id', budgetController.delete);
router.get('/summary', budgetController.getSummary);
router.get('/summary/range', budgetController.getSummaryByRange);

export default router;