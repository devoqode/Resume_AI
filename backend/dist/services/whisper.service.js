"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhisperService = void 0;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
class WhisperService {
    constructor(apiKey) {
        this.openai = new openai_1.default({ apiKey });
    }
    /**
     * Convert speech to text using OpenAI Whisper
     */
    async speechToText(audioFilePath, options) {
        try {
            // Check if file exists
            if (!fs_1.default.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }
            // Create a readable stream from the file
            const audioFile = fs_1.default.createReadStream(audioFilePath);
            const response = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: options?.model || 'whisper-1',
                language: options?.language,
                prompt: options?.prompt,
                response_format: options?.responseFormat || 'text',
                temperature: options?.temperature || 0,
            });
            if (options?.responseFormat === 'json' || options?.responseFormat === 'verbose_json') {
                return response.text || '';
            }
            return response;
        }
        catch (error) {
            console.error('Error in speech-to-text conversion:', error);
            throw new Error(`STT conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Convert speech to text with detailed response including timestamps
     */
    async speechToTextVerbose(audioFilePath, options) {
        try {
            // Check if file exists
            if (!fs_1.default.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }
            // Create a readable stream from the file
            const audioFile = fs_1.default.createReadStream(audioFilePath);
            const response = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: 'whisper-1',
                language: options?.language,
                prompt: options?.prompt,
                response_format: 'verbose_json',
                temperature: options?.temperature || 0,
            });
            return response;
        }
        catch (error) {
            console.error('Error in verbose speech-to-text conversion:', error);
            throw new Error(`Verbose STT conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Translate audio in foreign language to English text
     */
    async translateToEnglish(audioFilePath, options) {
        try {
            // Check if file exists
            if (!fs_1.default.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }
            // Create a readable stream from the file
            const audioFile = fs_1.default.createReadStream(audioFilePath);
            const response = await this.openai.audio.translations.create({
                file: audioFile,
                model: 'whisper-1',
                prompt: options?.prompt,
                response_format: options?.responseFormat || 'text',
                temperature: options?.temperature || 0,
            });
            if (options?.responseFormat === 'json' || options?.responseFormat === 'verbose_json') {
                return response.text || '';
            }
            return response;
        }
        catch (error) {
            console.error('Error in audio translation:', error);
            throw new Error(`Audio translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get supported audio formats and file size limits
     */
    getAudioRequirements() {
        return {
            maxFileSize: 25 * 1024 * 1024, // 25MB
            supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
            maxDuration: 2000, // seconds
        };
    }
    /**
     * Validate audio file before processing
     */
    async validateAudioFile(audioFilePath) {
        try {
            if (!fs_1.default.existsSync(audioFilePath)) {
                return { isValid: false, error: 'File does not exist' };
            }
            const stats = fs_1.default.statSync(audioFilePath);
            const requirements = this.getAudioRequirements();
            if (stats.size > requirements.maxFileSize) {
                return {
                    isValid: false,
                    error: `File size ${stats.size} bytes exceeds maximum allowed size of ${requirements.maxFileSize} bytes`,
                    fileSize: stats.size,
                };
            }
            const fileExtension = audioFilePath.split('.').pop()?.toLowerCase();
            if (!fileExtension || !requirements.supportedFormats.includes(fileExtension)) {
                return {
                    isValid: false,
                    error: `Unsupported file format. Supported formats: ${requirements.supportedFormats.join(', ')}`,
                    fileSize: stats.size,
                };
            }
            return {
                isValid: true,
                fileSize: stats.size,
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: `Error validating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
}
exports.WhisperService = WhisperService;
//# sourceMappingURL=whisper.service.js.map