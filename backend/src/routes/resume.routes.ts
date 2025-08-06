import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ResumeController } from '../controllers/resume.controller';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, './uploads/resumes/');
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const createResumeRoutes = (openaiApiKey: string) => {
  const router = Router();
  const resumeController = new ResumeController(openaiApiKey);

  // Upload and parse resume
  router.post('/upload', upload.single('resume'), resumeController.uploadResume);

  // Get user's resumes
  router.get('/user/:userId', resumeController.getResumes);
  router.get('/', resumeController.getResumes); // For authenticated requests

  // Get specific resume
  router.get('/:resumeId', resumeController.getResume);

  // Delete resume
  router.delete('/:resumeId', resumeController.deleteResume);

  // Re-parse existing resume
  router.post('/:resumeId/reparse', resumeController.reparseResume);

  // Get parsing statistics
  router.get('/user/:userId/stats', resumeController.getParsingStats);
  router.get('/stats', resumeController.getParsingStats); // For authenticated requests

  return router;
};
