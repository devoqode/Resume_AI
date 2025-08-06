import { Router, Request } from 'express';
import multer, { FileFilterCallback, File } from 'multer';
import path from 'path';
import { InterviewController } from '../controllers/interview.controller';

// Multer configuration for audio uploads
const audioStorage = multer.diskStorage({
  destination: (req: Request, file: File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, './uploads/audio/responses/');
  },
  filename: (req: Request, file: File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.mp3';
    cb(null, `response-${uniqueSuffix}${extension}`);
  },
});

const audioFileFilter = (req: Request, file: File, cb: FileFilterCallback) => {
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.mp4', '.mpeg', '.mpga'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
});

export const createInterviewRoutes = (
  openaiApiKey: string,
  elevenLabsApiKey: string,
  elevenLabsVoiceId: string
) => {
  const router = Router();
  const interviewController = new InterviewController(
    openaiApiKey,
    elevenLabsApiKey,
    elevenLabsVoiceId
  );

  // Start new interview session
  router.post('/start', interviewController.startInterview);

  // Submit response to interview question (with optional audio)
  router.post('/response', audioUpload.single('audio'), interviewController.submitResponse);

  // Complete interview and get final results
  router.post('/:sessionId/complete', interviewController.completeInterview);

  // Get specific interview session details
  router.get('/:sessionId', interviewController.getInterview);

  // Get user's interview sessions
  router.get('/user/:userId', interviewController.getInterviews);
  router.get('/', interviewController.getInterviews); // For authenticated requests

  // Delete interview session
  router.delete('/:sessionId', interviewController.deleteInterview);

  return router;
};
