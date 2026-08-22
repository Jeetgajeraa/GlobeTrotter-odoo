import { Router } from 'express';
import {
  getPublicTripsFeed,
  getPublicTripBySlug,
  copyPublicTrip,
} from '../controllers/shared.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Public explore feed of shared itineraries (no auth required)
router.get('/shared/explore', getPublicTripsFeed);

// View public itinerary by slug (no auth required)
router.get('/shared/trips/:shareSlug', getPublicTripBySlug);

// Copy/Fork public itinerary into authenticated user's account
router.post('/shared/trips/:shareSlug/copy', authenticateToken, copyPublicTrip);

export default router;
