import { Router } from 'express';
import {
  saveDestination,
  unsaveDestination,
  getSavedDestinations,
} from '../controllers/destination.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/saved', getSavedDestinations);
router.post('/saved/:cityId', saveDestination);
router.delete('/saved/:cityId', unsaveDestination);

export default router;
