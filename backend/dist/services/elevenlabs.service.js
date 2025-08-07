"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsService = void 0;
const elevenlabs_js_1 = require("@elevenlabs/elevenlabs-js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// ElevenLabs service implementation
class ElevenLabsService {
    constructor(apiKey, defaultVoiceId = 'pNInz6obpgDQGcFmaJgB') {
        this.client = new elevenlabs_js_1.ElevenLabsClient({ apiKey });
        this.defaultVoiceId = defaultVoiceId;
    }
    /**
     * Convert text to speech and return audio buffer with fallback support
     */
    async textToSpeech(text, voiceId, options) {
        try {
            const audioStream = await this.client.textToSpeech.convert(voiceId || this.defaultVoiceId, {
                text,
                modelId: 'eleven_multilingual_v2',
                voiceSettings: {
                    stability: options?.stability ?? 0.5,
                    similarityBoost: options?.similarityBoost ?? 0.8,
                    style: options?.style ?? 0.0,
                    useSpeakerBoost: options?.useSpeakerBoost ?? true,
                },
            });
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }
            // Convert Uint8Array chunks to Buffer
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const buffer = Buffer.alloc(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                buffer.set(chunk, offset);
                offset += chunk.length;
            }
            return buffer;
        }
        catch (error) {
            console.error('Error in text-to-speech conversion:', error);
            // Check if it's an authentication/free tier issue
            if (error instanceof Error && (error.message.includes('detected_unusual_activity') ||
                error.message.includes('Status code: 401') ||
                error.message.includes('Free Tier usage disabled'))) {
                console.log('ElevenLabs free tier disabled, falling back to OpenAI TTS');
                return await this.fallbackToOpenAITTS(text);
            }
            throw new Error(`TTS conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Fallback TTS using OpenAI when ElevenLabs fails
     */
    async fallbackToOpenAITTS(text) {
        try {
            // Import OpenAI dynamically
            const OpenAI = (await Promise.resolve().then(() => __importStar(require('openai')))).default;
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            const mp3 = await openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            console.log('Successfully generated audio using OpenAI TTS fallback');
            return buffer;
        }
        catch (fallbackError) {
            console.error('OpenAI TTS fallback also failed:', fallbackError);
            throw new Error(`Both ElevenLabs and OpenAI TTS failed. ElevenLabs may require a paid subscription for production use.`);
        }
    }
    /**
     * Save audio buffer to file and return file path
     */
    async saveAudioToFile(audioBuffer, filename, outputDir = './uploads/audio') {
        try {
            // Ensure output directory exists
            await promises_1.default.mkdir(outputDir, { recursive: true });
            const filePath = path_1.default.join(outputDir, `${filename}.mp3`);
            await promises_1.default.writeFile(filePath, audioBuffer);
            return filePath;
        }
        catch (error) {
            console.error('Error saving audio file:', error);
            throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Convert text to speech and save to file
     */
    async textToSpeechFile(text, filename, voiceId, options) {
        const audioBuffer = await this.textToSpeech(text, voiceId, options);
        return await this.saveAudioToFile(audioBuffer, filename, options?.outputDir);
    }
    /**
     * Get available voices
     */
    async getVoices() {
        try {
            const response = await this.client.voices.search();
            return response.voices || [];
        }
        catch (error) {
            console.error('Error fetching voices:', error);
            throw new Error(`Failed to fetch voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get specific voice details
     */
    async getVoice(voiceId) {
        try {
            const response = await this.client.voices.get(voiceId);
            return response;
        }
        catch (error) {
            console.error('Error fetching voice details:', error);
            throw new Error(`Failed to fetch voice details: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Create a custom voice from audio samples
     * Note: This is a premium feature that requires audio samples
     */
    async createCustomVoice(_name, _description, _audioFiles) {
        try {
            // Note: This method may need to be updated based on the actual ElevenLabs API
            throw new Error('Custom voice creation not implemented - please check ElevenLabs API documentation');
        }
        catch (error) {
            console.error('Error creating custom voice:', error);
            throw new Error(`Failed to create custom voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Speech to text conversion using ElevenLabs (if available)
     * Note: ElevenLabs primarily focuses on TTS. For STT, you might want to use OpenAI Whisper or other services
     */
    async speechToText(_audioFilePath) {
        try {
            // ElevenLabs doesn't have native STT, so we'll use a placeholder
            // In a real implementation, you might use OpenAI Whisper API or other STT services
            throw new Error('Speech-to-text not implemented with ElevenLabs. Consider using OpenAI Whisper API.');
        }
        catch (error) {
            console.error('Error in speech-to-text conversion:', error);
            throw error;
        }
    }
    /**
     * Get user subscription info and limits
     */
    async getUserInfo() {
        try {
            const response = await this.client.user.get();
            return response;
        }
        catch (error) {
            console.error('Error fetching user info:', error);
            throw new Error(`Failed to fetch user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get voice settings for a specific voice
     */
    async getVoiceSettings(voiceId) {
        try {
            const response = await this.client.voices.settings.get(voiceId);
            return response;
        }
        catch (error) {
            console.error('Error fetching voice settings:', error);
            throw new Error(`Failed to fetch voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update voice settings for a specific voice
     */
    async updateVoiceSettings(_voiceId, _settings) {
        try {
            // Note: Voice settings editing may need to be implemented based on actual ElevenLabs API
            throw new Error('Voice settings update not implemented - please check ElevenLabs API documentation');
        }
        catch (error) {
            console.error('Error updating voice settings:', error);
            throw new Error(`Failed to update voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate interview question audio files in batch
     */
    async generateInterviewAudio(questions, voiceId, outputDir) {
        const results = [];
        for (const question of questions) {
            try {
                const filename = `question_${question.id}`;
                const audioPath = await this.textToSpeechFile(question.text, filename, voiceId, { outputDir });
                results.push({
                    questionId: question.id,
                    audioPath,
                });
            }
            catch (error) {
                console.error(`Error generating audio for question ${question.id}:`, error);
                // Continue with other questions even if one fails
            }
        }
        return results;
    }
}
exports.ElevenLabsService = ElevenLabsService;
//# sourceMappingURL=elevenlabs.service.js.map