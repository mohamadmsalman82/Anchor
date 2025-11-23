import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { getHomeAnalytics } from '../controllers/insightController.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getDashboard);
router.get('/analytics/home', getHomeAnalytics);

export default router;
