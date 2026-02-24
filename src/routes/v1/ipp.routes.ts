import { Router } from 'express';
import { ippController } from '../../controllers/v1/ipp.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', ippController.get);
router.put('/', ippController.upsert);
router.get('/contributions', ippController.getContributions);

export default router;