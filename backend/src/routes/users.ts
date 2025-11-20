import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSessionById, getUserProfile, updateProfile, uploadProfilePicture, deleteProfilePicture } from '../controllers/userController.js';
import { profilePictureUpload } from '../middleware/profilePictureUpload.js';
import {
  getUserDomainOverrides,
  createOrUpdateDomainOverride,
  deleteDomainOverride,
} from '../controllers/domainController.js';

const router = Router();

// Session detail - auth middleware is optional (for ownership check)
// Route will work without auth, but won't show private sessions
router.get('/sessions/:id', (req, res, next) => {
  // Try to authenticate, but don't fail if no token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authMiddleware(req as any, res, next);
  } else {
    next();
  }
}, getSessionById);

// Profile routes
router.get('/users/:id/profile', getUserProfile);

// Authenticated profile routes
router.put('/me/profile', authMiddleware, updateProfile);
router.post('/me/profile/picture', authMiddleware, profilePictureUpload.single('picture'), uploadProfilePicture);
router.delete('/me/profile/picture', authMiddleware, deleteProfilePicture);

// Domain override routes
router.get('/me/domain-overrides', authMiddleware, getUserDomainOverrides);
router.post('/me/domain-overrides', authMiddleware, createOrUpdateDomainOverride);
router.delete('/me/domain-overrides/:domain', authMiddleware, deleteDomainOverride);

export default router;
