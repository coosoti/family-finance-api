import { Router } from 'express';
import { transactionsController } from '../../controllers/v1/transactions.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', transactionsController.getAll);
router.get('/range', transactionsController.getByRange);
router.get('/month/:month', transactionsController.getByMonth);
router.get('/:id', transactionsController.getById);
router.post('/', transactionsController.create);
router.put('/:id', transactionsController.update);
router.delete('/:id', transactionsController.delete);

export default router;