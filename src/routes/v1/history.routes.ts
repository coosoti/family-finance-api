import { Router } from 'express';
import { historyController } from '../../controllers/v1/history.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/range', historyController.getByRange);
router.get('/:month', historyController.getByMonth);

export default router;