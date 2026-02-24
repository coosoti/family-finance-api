import { Router } from 'express';
import { profileController } from '../../controllers/v1/profile.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', profileController.get);
router.put('/', profileController.update);

export default router;