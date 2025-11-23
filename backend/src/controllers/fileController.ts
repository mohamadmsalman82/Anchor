import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /sessions/:sessionId/files
 * Upload files for a session
 */
export async function uploadFiles(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sessionId = req.params.sessionId;

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    // We need to filter out any non-file objects if multer types are weird, but casting helps
    const fileList = files.filter((f): f is Express.Multer.File => !!f && 'originalname' in f);

    const uploadedFiles = [];

    for (const file of fileList) {
      const fileUrl = `/uploads/${file.filename}`;
      
      const sessionFile = await prisma.sessionFile.create({
        data: {
          sessionId,
          filename: file.originalname,
          filepath: file.path,
          fileUrl,
          fileType: file.mimetype,
          fileSize: file.size,
        },
      });

      uploadedFiles.push({
        id: sessionFile.id,
        filename: sessionFile.filename,
        fileUrl: sessionFile.fileUrl,
        fileType: sessionFile.fileType,
        fileSize: sessionFile.fileSize,
      });
    }

    res.json({
      files: uploadedFiles,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * POST /sessions/files/upload
 * Upload files without a session (for pre-upload before session ends)
 * Returns file IDs that can be sent with endSession
 */
export async function uploadFilesTemporary(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const fileList = files.filter((f): f is Express.Multer.File => !!f && 'originalname' in f);

    const uploadedFiles = [];

    for (const file of fileList) {
      const fileUrl = `/uploads/${file.filename}`;
      
      // Create file record without sessionId (will be linked later)
      const sessionFile = await prisma.sessionFile.create({
        data: {
          sessionId: null, // Temporary, will be updated when session ends
          filename: file.originalname,
          filepath: file.path,
          fileUrl,
          fileType: file.mimetype,
          fileSize: file.size,
        },
      });

      uploadedFiles.push({
        id: sessionFile.id,
        filename: sessionFile.filename,
        fileUrl: sessionFile.fileUrl,
        fileType: sessionFile.fileType,
        fileSize: sessionFile.fileSize,
      });
    }

    res.json({
      files: uploadedFiles,
    });
  } catch (error) {
    throw error;
  }
}
