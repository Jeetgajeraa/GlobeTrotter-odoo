import { Router } from 'express';
import { register, login, getMe, updateProfile, deleteProfile, logout } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadProfilePhoto } from '../middlewares/upload.middleware.js';

const router = Router();

// Public routes
router.post('/register', uploadProfilePhoto.single('profilePhoto'), register);
router.post('/login', login);

router.use(authenticateToken);
// Protected routes
router.get('/me', getMe);
router.patch('/me', uploadProfilePhoto.single('profilePhoto'), updateProfile);
router.delete('/me', deleteProfile);

router.post('/logout', logout);

export default router;
