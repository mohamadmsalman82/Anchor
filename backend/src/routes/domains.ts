import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getDomains,
  getDomainClassification,
} from '../controllers/domainController.js';

const router = Router();

// Get master domain lists and user overrides (for frontend settings)
router.get('/', authMiddleware, getDomains);

// Get classification for a specific domain (for extension use)
router.get('/classification', authMiddleware, getDomainClassification);

export default router;
