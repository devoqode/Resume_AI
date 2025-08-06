import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { VoiceController } from '../controllers/voice.controller';

// Multer configuration for audio uploads (STT)
const sttStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/audio/stt/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname) || '.mp3';
    cb(null, `stt-${uniqueSuffix}${extension}`);
  },
});

const audioFileFilter = (req: any, file: any, cb: any) => {
  // Whisper supported formats
  const allowedExtensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm'), false);
  }
};

const sttUpload = multer({
  storage: sttStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
});

export const createVoiceRoutes = (
  elevenLabsApiKey: string,
  elevenLabsVoiceId: string,
  openaiApiKey: string
) => {
  const router = Router();
  const voiceController = new VoiceController(
    elevenLabsApiKey,
    elevenLabsVoiceId,
    openaiApiKey
  );

  // Text-to-Speech routes
  router.post('/tts', voiceController.textToSpeech);
  router.post('/tts/file', voiceController.textToSpeechFile);

  // Speech-to-Text routes
  router.post('/stt', sttUpload.single('audio'), voiceController.speechToText);
  router.post('/stt/verbose', sttUpload.single('audio'), voiceController.speechToTextVerbose);

  // Voice management routes
  router.get('/voices', voiceController.getVoices);
  router.get('/voices/:voiceId', voiceController.getVoice);
  router.get('/voices/:voiceId/settings', voiceController.getVoiceSettings);
  router.put('/voices/:voiceId/settings', voiceController.updateVoiceSettings);

  // Serve audio files
  router.get('/audio/:filename', voiceController.serveAudioFile);

  // Get audio requirements and limits
  router.get('/requirements', voiceController.getAudioRequirements);

  // Get ElevenLabs user info and quota
  router.get('/user/info', voiceController.getUserInfo);

  return router;
};
