import { Router } from 'express';
import {
  getAnalytics,
  getPopularDestinations,
  getPopularActivities,
  getAllUsers,
  updateUserRole,
  getAllTrips,
} from '../controllers/admin.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// All admin routes require a valid JWT and ADMIN role
router.use(authenticateToken, requireAdmin);

//Overview & Analytics
router.get('/analytics', getAnalytics);

//Popular Destinations
router.get('/destinations/popular', getPopularDestinations);

//Popular Activities
router.get('/activities/popular', getPopularActivities);

//User Management
router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);

//Platform Trips
router.get('/trips', getAllTrips);

export default router;
