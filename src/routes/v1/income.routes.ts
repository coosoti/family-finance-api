import { Router } from 'express';
import { incomeController } from '../../controllers/v1/income.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', incomeController.getAll);
router.get('/month/:month', incomeController.getByMonth);
router.post('/', incomeController.create);
router.put('/:id', incomeController.update);
router.delete('/:id', incomeController.delete);

export default router;