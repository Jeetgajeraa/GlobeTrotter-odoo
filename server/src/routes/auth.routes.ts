import { Router } from 'express';
import { register, login, getMe, logout } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadProfilePhoto } from '../middlewares/upload.middleware.js';

const router = Router();

// Public routes
router.post('/register', uploadProfilePhoto.single('profilePhoto'), register);
router.post('/login', login);

router.use(authenticateToken)
// Protected routes
router.get('/me', getMe);
router.post('/logout', logout);

export default router;
