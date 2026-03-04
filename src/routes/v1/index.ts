import { Router } from 'express';
import authRoutes from './auth.routes';
import transactionsRoutes from './transactions.routes';
import budgetRoutes from './budget.routes';
import savingsRoutes from './savings.routes';
import networthRoutes from './networth.routes';
import ippRoutes from './ipp.routes';
import investmentsRoutes from './investments.routes';
import incomeRoutes from './income.routes';
import analyticsRoutes from './analytics.routes';
import historyRoutes from './history.routes';
import profileRoutes from './profile.routes';
import recurringRoutes from './recurring.routes';


const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/budget', budgetRoutes);
router.use('/savings', savingsRoutes);
router.use('/networth', networthRoutes);
router.use('/ipp', ippRoutes);
router.use('/investments', investmentsRoutes);
router.use('/income', incomeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/history', historyRoutes);
router.use('/recurring', recurringRoutes);

export default router;