import { Router } from 'express';
import {
  addExpense,
  getTripExpenses,
  updateExpense,
  deleteExpense,
  getTripBudgetSummary,
} from '../controllers/expense.controller.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../middlewares/auth.middleware.js';

const router = Router();

// Add an expense to a trip
router.post('/trips/:tripId/expenses', authenticateToken, addExpense);

// Get all logged expenses for a trip (supports category, stopId filtering)
router.get('/trips/:tripId/expenses', optionalAuthenticateToken, getTripExpenses);

// Get budget analytics & cost breakdown (Screen 9: Charts, daily average, category percentages)
router.get('/trips/:tripId/budget', optionalAuthenticateToken, getTripBudgetSummary);

// Update single expense
router.patch('/expenses/:id', authenticateToken, updateExpense);

// Delete single expense
router.delete('/expenses/:id', authenticateToken, deleteExpense);

export default router;
