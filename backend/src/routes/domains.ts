import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getDomains,
  getDomainClassification,
  createOrUpdateOverride,
  deleteOverride,
  createOrUpdateDomain,
} from '../controllers/domainController.js';

const router = Router();

// User-specific domain overrides (require auth)
router.get('/', authMiddleware, getDomains);
router.get('/classification', authMiddleware, getDomainClassification);
router.post('/override', authMiddleware, createOrUpdateOverride);
router.delete('/override/:domain', authMiddleware, deleteOverride);

// Legacy global domain config (kept for backward compatibility)
router.post('/', createOrUpdateDomain);

export default router;

