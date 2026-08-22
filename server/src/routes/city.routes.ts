import { Router } from 'express';
import {
  getCities,
  getPopularCities,
  getCityById,
  createCity,
  updateCity,
  deleteCity,
} from '../controllers/city.controller.js';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
} from '../middlewares/auth.middleware.js';
import { uploadGeneral } from '../middlewares/upload.middleware.js';

const router = Router();

// Public / Discovery routes
router.get('/', getCities);
router.get('/popular', getPopularCities);
router.get('/:id', optionalAuthenticateToken, getCityById);

// Admin-only management routes
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  uploadGeneral.single('imageUrl'),
  createCity
);
router.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  uploadGeneral.single('imageUrl'),
  updateCity
);
router.delete('/:id', authenticateToken, requireAdmin, deleteCity);

export default router;
