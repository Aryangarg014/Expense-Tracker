import { Router } from 'express';
import { createExpense, getExpenses } from '../controllers/expenseController';
import { protect } from '../middleware/auth';

const router = Router();

// Apply the 'protect' middleware to all expense routes.
// This ensures that `req.user` is populated before hitting the controllers.
router.use(protect);

// POST /api/expenses - Create a new expense
router.post('/', createExpense);

// GET /api/expenses - List expenses (supports ?category=xxx and ?sort=date_desc)
router.get('/', getExpenses);

export default router;
