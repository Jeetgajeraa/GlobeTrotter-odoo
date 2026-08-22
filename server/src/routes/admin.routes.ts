import { Router } from 'express';
import {
  getAdminAnalytics,
  getAdminPopularDestinations,
  getAdminPopularActivities,
  getAdminUsers,
  updateAdminUserRole,
  getAdminAllTrips,
} from '../controllers/admin.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Apply Authentication and Admin Privileges on all Admin routes
router.use(authenticateToken, requireAdmin);

// Analytics & Overview
router.get('/admin/analytics', getAdminAnalytics);
router.get('/admin/destinations/popular', getAdminPopularDestinations);
router.get('/admin/activities/popular', getAdminPopularActivities);

// User Management
router.get('/admin/users', getAdminUsers);
router.patch('/admin/users/:id/role', updateAdminUserRole);

// Platform Trips Oversight
router.get('/admin/trips', getAdminAllTrips);

export default router;
