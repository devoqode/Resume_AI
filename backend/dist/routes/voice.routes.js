"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoiceRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const voice_controller_1 = require("../controllers/voice.controller");
// Multer configuration for audio uploads (STT)
const sttStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/audio/stt/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname) || '.mp3';
        cb(null, `stt-${uniqueSuffix}${extension}`);
    },
});
const audioFileFilter = (req, file, cb) => {
    // Whisper supported formats
    const allowedExtensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension) || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Unsupported audio format. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm'), false);
    }
};
const sttUpload = (0, multer_1.default)({
    storage: sttStorage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
    },
});
const createVoiceRoutes = (elevenLabsApiKey, elevenLabsVoiceId, openaiApiKey) => {
    const router = (0, express_1.Router)();
    const voiceController = new voice_controller_1.VoiceController(elevenLabsApiKey, elevenLabsVoiceId, openaiApiKey);
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
exports.createVoiceRoutes = createVoiceRoutes;
//# sourceMappingURL=voice.routes.js.map