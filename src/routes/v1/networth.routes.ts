import { Router } from 'express';
import { networthController } from '../../controllers/v1/networth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', networthController.getCurrent);
router.get('/history', networthController.getHistory);
router.get('/assets', networthController.getAllAssets);
router.post('/assets', networthController.createAsset);
router.put('/assets/:id', networthController.updateAsset);
router.delete('/assets/:id', networthController.deleteAsset);

export default router;