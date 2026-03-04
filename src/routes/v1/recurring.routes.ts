import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getRecurringItems,
  getRecurringItem,
  createRecurringItem,
  updateRecurringItem,
  deleteRecurringItem,
  markRecurringAsPaid,
  autoGenerateTransactions,
  getUpcomingBills,
  getUnusedSubscriptions,
  getRecurringSummary,
} from '../../controllers/v1/recurring.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Analytics (before /:id to avoid route conflicts) ─────────────────────────
router.get('/upcoming', getUpcomingBills);          // GET  /api/v1/recurring/upcoming?days=30
router.get('/unused',         getUnusedSubscriptions);    // GET  /api/v1/recurring/unused
router.get('/summary',        getRecurringSummary);       // GET  /api/v1/recurring/summary
router.post('/auto-generate', autoGenerateTransactions);  // POST /api/v1/recurring/auto-generate

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/', getRecurringItems);    // GET    /api/v1/recurring
router.post('/', createRecurringItem); // POST   /api/v1/recurring

router.get('/:id', getRecurringItem);    // GET    /api/v1/recurring/:id
router.put('/:id', updateRecurringItem); // PUT    /api/v1/recurring/:id
router.delete('/:id', deleteRecurringItem); // DELETE /api/v1/recurring/:id

// ── Actions ───────────────────────────────────────────────────────────────────
router.post('/:id/pay', markRecurringAsPaid); // POST /api/v1/recurring/:id/pay

export default router;