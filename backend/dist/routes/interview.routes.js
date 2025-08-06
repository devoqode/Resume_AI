"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInterviewRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const interview_controller_1 = require("../controllers/interview.controller");
// Multer configuration for audio uploads
const audioStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/audio/responses/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const extension = path_1.default.extname(file.originalname) || '.mp3';
        cb(null, `response-${uniqueSuffix}${extension}`);
    },
});
const audioFileFilter = (req, file, cb) => {
    const allowedExtensions = [
        '.mp3',
        '.wav',
        '.m4a',
        '.webm',
        '.mp4',
        '.mpeg',
        '.mpga',
    ];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension) ||
        file.mimetype.startsWith('audio/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only audio files are allowed'), false);
    }
};
const audioUpload = (0, multer_1.default)({
    storage: audioStorage,
    fileFilter: audioFileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
    },
});
const createInterviewRoutes = (openaiApiKey, elevenLabsApiKey, elevenLabsVoiceId) => {
    const router = (0, express_1.Router)();
    const interviewController = new interview_controller_1.InterviewController(openaiApiKey, elevenLabsApiKey, elevenLabsVoiceId);
    // Start new interview session
    router.post('/start', interviewController.startInterview);
    // Submit response to interview question (with optional audio)
    router.post('/response', audioUpload.single('audio'), interviewController.submitResponse);
    // Complete interview and get final results
    router.post('/:sessionId/complete', interviewController.completeInterview);
    // Get specific interview session details
    router.get('/:sessionId', interviewController.getSession.bind(interviewController));
    // Get user's interview sessions
    router.get('/user/:userId', interviewController.getUserSessions.bind(interviewController));
    router.get('/', interviewController.getUserSessions.bind(interviewController)); // For authenticated requests
    // Delete interview session
    router.delete('/:sessionId', interviewController.deleteSession.bind(interviewController));
    return router;
};
exports.createInterviewRoutes = createInterviewRoutes;
//# sourceMappingURL=interview.routes.js.map