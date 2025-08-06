import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { VoiceController } from '../controllers/voice.controller';

// Multer configuration for audio uploads (STT)
const sttStorage = multer.diskStorage({
  destination: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, './uploads/audio/stt/');
  },
  filename: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '.mp3';
    cb(null, `stt-${uniqueSuffix}${extension}`);
  },
});

const audioFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile?: boolean) => void
) => {
  // Whisper supported formats
  const allowedExtensions = [
    '.mp3',
    '.mp4',
    '.mpeg',
    '.mpga',
    '.m4a',
    '.wav',
    '.webm',
  ];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedExtensions.includes(fileExtension) ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Unsupported audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm'
      ),
      false
    );
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
  router.post('/tts', voiceController.textToSpeech.bind(voiceController));
  router.post(
    '/tts/file',
    voiceController.textToSpeechFile.bind(voiceController)
  );

  // Speech-to-Text routes
  router.post(
    '/stt',
    sttUpload.single('audio'),
    voiceController.speechToText.bind(voiceController)
  );
  router.post(
    '/stt/verbose',
    sttUpload.single('audio'),
    voiceController.speechToTextVerbose.bind(voiceController)
  );

  // Voice management routes
  router.get('/voices', voiceController.getVoices.bind(voiceController));
  router.get(
    '/voices/:voiceId',
    voiceController.getVoice.bind(voiceController)
  );
  router.get(
    '/voices/:voiceId/settings',
    voiceController.getVoiceSettings.bind(voiceController)
  );
  router.put(
    '/voices/:voiceId/settings',
    voiceController.updateVoiceSettings.bind(voiceController)
  );

  // Serve audio files
  router.get(
    '/audio/:filename',
    voiceController.serveAudioFile.bind(voiceController)
  );

  // Get audio requirements and limits
  router.get(
    '/requirements',
    voiceController.getAudioRequirements.bind(voiceController)
  );

  // Get ElevenLabs user info and quota
  router.get('/user/info', voiceController.getUserInfo.bind(voiceController));

  return router;
};
