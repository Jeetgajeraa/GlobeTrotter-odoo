import { Router } from 'express';
import {
  getUserCalendar,
  getTripTimeline,
} from '../controllers/calendar.controller.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../middlewares/auth.middleware.js';

const router = Router();

// User-wide calendar view (Screen 11: Month calendar grid plotting all user trips)
router.get('/calendar', authenticateToken, getUserCalendar);

// Specific trip day-by-day timeline (Screens 9 & 11: Day 1, Day 2... with activities & expenses)
router.get('/trips/:tripId/calendar', optionalAuthenticateToken, getTripTimeline);

export default router;
