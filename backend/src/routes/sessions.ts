import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { startSession, uploadActivity, endSession, updateSession } from '../controllers/sessionController.js';
import { uploadFiles, uploadFilesTemporary } from '../controllers/fileController.js';
import { generateSessionInsight, getSessionInsight } from '../controllers/insightController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// All session routes require authentication
router.use(authMiddleware);

router.post('/start', startSession);
router.post('/activity', uploadActivity);
router.post('/end', endSession);
router.patch('/:id', updateSession);
router.post('/files/upload', upload.array('files', 10), uploadFilesTemporary);
router.post('/:sessionId/files', upload.array('files', 10), uploadFiles);

// AI Insights
router.post('/:id/insights', generateSessionInsight);
router.get('/:id/insights', getSessionInsight);

export default router;
