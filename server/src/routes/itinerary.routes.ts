import { Router } from 'express';
import {
  addStop,
  getTripStops,
  updateStop,
  deleteStop,
  reorderStops,
  addStopActivity,
  updateStopActivity,
  deleteStopActivity,
  reorderStopActivities,
} from '../controllers/itinerary.controller.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../middlewares/auth.middleware.js';

const router = Router();
router.post('/trips/:tripId/stops', authenticateToken, addStop);

// Get all stops of a trip (Public or authorized user)
router.get('/trips/:tripId/stops', optionalAuthenticateToken, getTripStops);

// Reorder stops in a trip
router.patch('/trips/:tripId/stops/reorder', authenticateToken, reorderStops);

// Update single stop
router.patch('/stops/:stopId', authenticateToken, updateStop);

// Delete single stop
router.delete('/stops/:stopId', authenticateToken, deleteStop);

// ==========================================
// 2. STOP ACTIVITIES ROUTES (Day-wise items)
// ==========================================

// Schedule an activity into a stop
router.post('/stops/:stopId/activities', authenticateToken, addStopActivity);

// Reorder activities within a stop (drag and drop)
router.patch('/stops/:stopId/activities/reorder', authenticateToken, reorderStopActivities);

// Update scheduled activity details
router.patch('/stop-activities/:id', authenticateToken, updateStopActivity);

// Delete scheduled activity
router.delete('/stop-activities/:id', authenticateToken, deleteStopActivity);

export default router;
