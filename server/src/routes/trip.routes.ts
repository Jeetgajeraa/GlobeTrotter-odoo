import { Router } from 'express';
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  toggleTripVisibility,
} from '../controllers/trip.controller.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
} from '../middlewares/auth.middleware.js';
import { uploadTripPhoto } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/', authenticateToken, uploadTripPhoto.single('coverPhoto'), createTrip);
router.get('/', authenticateToken, getUserTrips);
router.get('/:id', optionalAuthenticateToken, getTripById);
router.patch('/:id', authenticateToken, uploadTripPhoto.single('coverPhoto'), updateTrip);
router.patch('/:id/visibility', authenticateToken, toggleTripVisibility);

router.delete('/:id', authenticateToken, deleteTrip);

export default router;