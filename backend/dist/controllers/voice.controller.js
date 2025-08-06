"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const elevenlabs_service_1 = require("../services/elevenlabs.service");
const whisper_service_1 = require("../services/whisper.service");
class VoiceController {
    constructor(elevenLabsApiKey, elevenLabsVoiceId, openaiApiKey) {
        /**
         * Convert text to speech using ElevenLabs
         */
        this.textToSpeech = async (req, res) => {
            try {
                const { text, voiceId, settings } = req.body;
                if (!text || typeof text !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'Text is required and must be a string',
                    });
                    return;
                }
                if (text.length > 5000) {
                    res.status(400).json({
                        success: false,
                        error: 'Text too long. Maximum 5000 characters allowed.',
                    });
                    return;
                }
                // Generate audio
                const audioBuffer = await this.elevenLabsService.textToSpeech(text, voiceId, settings);
                // Set response headers for audio
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.length.toString(),
                    'Content-Disposition': 'attachment; filename="speech.mp3"',
                });
                res.send(audioBuffer);
            }
            catch (error) {
                console.error('Error in text-to-speech:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Text-to-speech conversion failed',
                });
            }
        };
        /**
         * Convert text to speech and save as file
         */
        this.textToSpeechFile = async (req, res) => {
            try {
                const { text, voiceId, settings, filename } = req.body;
                if (!text || typeof text !== 'string') {
                    res.status(400).json({
                        success: false,
                        error: 'Text is required and must be a string',
                    });
                    return;
                }
                const audioFilename = filename || `tts_${Date.now()}`;
                // Generate and save audio file
                const filePath = await this.elevenLabsService.textToSpeechFile(text, audioFilename, voiceId, { ...settings, outputDir: './uploads/audio/tts' });
                res.json({
                    success: true,
                    data: {
                        filePath,
                        filename: `${audioFilename}.mp3`,
                        url: `/api/voice/audio/${path_1.default.basename(filePath)}`,
                    },
                });
            }
            catch (error) {
                console.error('Error in text-to-speech file generation:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Text-to-speech file generation failed',
                });
            }
        };
        /**
         * Convert speech to text using Whisper
         */
        this.speechToText = async (req, res) => {
            try {
                const audioFile = req.file;
                if (!audioFile) {
                    res.status(400).json({
                        success: false,
                        error: 'Audio file is required',
                    });
                    return;
                }
                // Validate audio file
                const validation = await this.whisperService.validateAudioFile(audioFile.path);
                if (!validation.isValid) {
                    res.status(400).json({
                        success: false,
                        error: validation.error,
                    });
                    return;
                }
                // Transcribe audio
                const transcription = await this.whisperService.speechToText(audioFile.path);
                // Clean up uploaded file
                try {
                    fs_1.default.unlinkSync(audioFile.path);
                }
                catch (cleanupError) {
                    console.warn('Could not delete temporary audio file:', cleanupError);
                }
                res.json({
                    success: true,
                    data: {
                        transcription,
                        fileSize: validation.fileSize,
                    },
                });
            }
            catch (error) {
                console.error('Error in speech-to-text:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Speech-to-text conversion failed',
                });
            }
        };
        /**
         * Convert speech to text with detailed response
         */
        this.speechToTextVerbose = async (req, res) => {
            try {
                const audioFile = req.file;
                const { language, prompt } = req.body;
                if (!audioFile) {
                    res.status(400).json({
                        success: false,
                        error: 'Audio file is required',
                    });
                    return;
                }
                // Validate audio file
                const validation = await this.whisperService.validateAudioFile(audioFile.path);
                if (!validation.isValid) {
                    res.status(400).json({
                        success: false,
                        error: validation.error,
                    });
                    return;
                }
                // Get verbose transcription
                const result = await this.whisperService.speechToTextVerbose(audioFile.path, {
                    language,
                    prompt,
                });
                // Clean up uploaded file
                try {
                    fs_1.default.unlinkSync(audioFile.path);
                }
                catch (cleanupError) {
                    console.warn('Could not delete temporary audio file:', cleanupError);
                }
                res.json({
                    success: true,
                    data: {
                        ...result,
                        fileSize: validation.fileSize,
                    },
                });
            }
            catch (error) {
                console.error('Error in verbose speech-to-text:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Verbose speech-to-text conversion failed',
                });
            }
        };
        /**
         * Get available voices from ElevenLabs
         */
        this.getVoices = async (req, res) => {
            try {
                const voices = await this.elevenLabsService.getVoices();
                res.json({
                    success: true,
                    data: voices,
                });
            }
            catch (error) {
                console.error('Error fetching voices:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch voices',
                });
            }
        };
        /**
         * Get specific voice details
         */
        this.getVoice = async (req, res) => {
            try {
                const { voiceId } = req.params;
                if (!voiceId) {
                    res.status(400).json({
                        success: false,
                        error: 'Voice ID is required',
                    });
                    return;
                }
                const voice = await this.elevenLabsService.getVoice(voiceId);
                res.json({
                    success: true,
                    data: voice,
                });
            }
            catch (error) {
                console.error('Error fetching voice details:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Failed to fetch voice details',
                });
            }
        };
        /**
         * Get voice settings
         */
        this.getVoiceSettings = async (req, res) => {
            try {
                const { voiceId } = req.params;
                if (!voiceId) {
                    res.status(400).json({
                        success: false,
                        error: 'Voice ID is required',
                    });
                    return;
                }
                const settings = await this.elevenLabsService.getVoiceSettings(voiceId);
                res.json({
                    success: true,
                    data: settings,
                });
            }
            catch (error) {
                console.error('Error fetching voice settings:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Failed to fetch voice settings',
                });
            }
        };
        /**
         * Update voice settings
         */
        this.updateVoiceSettings = async (req, res) => {
            try {
                const { voiceId } = req.params;
                const { stability, similarityBoost, style, useSpeakerBoost } = req.body;
                if (!voiceId) {
                    res.status(400).json({
                        success: false,
                        error: 'Voice ID is required',
                    });
                    return;
                }
                await this.elevenLabsService.updateVoiceSettings(voiceId, {
                    stability,
                    similarityBoost,
                    style,
                    useSpeakerBoost,
                });
                res.json({
                    success: true,
                    message: 'Voice settings updated successfully',
                });
            }
            catch (error) {
                console.error('Error updating voice settings:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : 'Failed to update voice settings',
                });
            }
        };
        /**
         * Serve audio files
         */
        this.serveAudioFile = async (req, res) => {
            try {
                const { filename } = req.params;
                const audioPath = path_1.default.join('./uploads/audio', filename);
                if (!fs_1.default.existsSync(audioPath)) {
                    res.status(404).json({
                        success: false,
                        error: 'Audio file not found',
                    });
                    return;
                }
                const stat = fs_1.default.statSync(audioPath);
                const fileSize = stat.size;
                const range = req.headers.range;
                if (range) {
                    // Handle range requests for audio streaming
                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = end - start + 1;
                    const file = fs_1.default.createReadStream(audioPath, { start, end });
                    const head = {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': 'audio/mpeg',
                    };
                    res.writeHead(206, head);
                    file.pipe(res);
                }
                else {
                    // Serve entire file
                    const head = {
                        'Content-Length': fileSize,
                        'Content-Type': 'audio/mpeg',
                    };
                    res.writeHead(200, head);
                    fs_1.default.createReadStream(audioPath).pipe(res);
                }
            }
            catch (error) {
                console.error('Error serving audio file:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to serve audio file',
                });
            }
        };
        /**
         * Get audio file requirements and limits
         */
        this.getAudioRequirements = async (req, res) => {
            try {
                const requirements = this.whisperService.getAudioRequirements();
                res.json({
                    success: true,
                    data: {
                        speechToText: requirements,
                        textToSpeech: {
                            maxTextLength: 5000,
                            supportedVoices: 'Available via /api/voice/voices endpoint',
                            outputFormat: 'MP3',
                        },
                    },
                });
            }
            catch (error) {
                console.error('Error fetching audio requirements:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch audio requirements',
                });
            }
        };
        /**
         * Get ElevenLabs user info and quota
         */
        this.getUserInfo = async (req, res) => {
            try {
                const userInfo = await this.elevenLabsService.getUserInfo();
                res.json({
                    success: true,
                    data: userInfo,
                });
            }
            catch (error) {
                console.error('Error fetching user info:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch user info',
                });
            }
        };
        this.elevenLabsService = new elevenlabs_service_1.ElevenLabsService(elevenLabsApiKey, elevenLabsVoiceId);
        this.whisperService = new whisper_service_1.WhisperService(openaiApiKey);
    }
}
exports.VoiceController = VoiceController;
//# sourceMappingURL=voice.controller.js.map