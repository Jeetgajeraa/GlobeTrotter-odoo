import { Router } from 'express';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} from '../controllers/activity.controller.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware.js';
import { uploadGeneral } from '../middlewares/upload.middleware.js';

const router = Router();

// Public routes
router.get('/', getActivities);
router.get('/:id', getActivityById);

// Admin-only management routes
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  uploadGeneral.single('imageUrl'),
  createActivity
);
router.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  uploadGeneral.single('imageUrl'),
  updateActivity
);
router.delete('/:id', authenticateToken, requireAdmin, deleteActivity);

export default router;
