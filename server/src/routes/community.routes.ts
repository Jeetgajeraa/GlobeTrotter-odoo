import { Router } from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  likePost,
  unlikePost,
  updatePost,
  deletePost,
} from '../controllers/community.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { uploadPostPhoto } from '../middlewares/upload.middleware.js';

const router = Router();

// Public community feed & post detail
router.get('/community/posts', getPosts);
router.get('/community/posts/:id', getPostById);

// Protected actions: Create, update, like, unlike, delete
router.post(
  '/community/posts',
  authenticateToken,
  uploadPostPhoto.single('imageUrl'),
  createPost
);
router.patch(
  '/community/posts/:id',
  authenticateToken,
  uploadPostPhoto.single('imageUrl'),
  updatePost
);
router.post('/community/posts/:id/like', authenticateToken, likePost);
router.post('/community/posts/:id/unlike', authenticateToken, unlikePost);
router.delete('/community/posts/:id', authenticateToken, deletePost);

export default router;
