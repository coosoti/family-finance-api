import { Router } from 'express';
import { investmentsController } from '../../controllers/v1/investments.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', investmentsController.getAll);
router.get('/dividends', investmentsController.getDividends);
router.get('/:id', investmentsController.getById);
router.post('/', investmentsController.create);
router.put('/:id', investmentsController.update);
router.delete('/:id', investmentsController.delete);
router.post('/:id/dividends', investmentsController.addDividend);

export default router;