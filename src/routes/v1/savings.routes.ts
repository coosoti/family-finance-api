import { Router } from 'express';
import { savingsController } from '../../controllers/v1/savings.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/goals', savingsController.getAll);
router.get('/goals/:id', savingsController.getById);
router.post('/goals', savingsController.create);
router.put('/goals/:id', savingsController.update);
router.delete('/goals/:id', savingsController.delete);
router.get('/contributions', savingsController.getContributions);

export default router;