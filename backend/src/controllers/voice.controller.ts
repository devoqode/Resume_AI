import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ElevenLabsService } from '../services/elevenlabs.service';
import { WhisperService } from '../services/whisper.service';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

export class VoiceController {
  private elevenLabsService: ElevenLabsService;
  private whisperService: WhisperService;

  constructor(
    elevenLabsApiKey: string,
    elevenLabsVoiceId: string,
    openaiApiKey: string
  ) {
    this.elevenLabsService = new ElevenLabsService(elevenLabsApiKey, elevenLabsVoiceId);
    this.whisperService = new WhisperService(openaiApiKey);
  }

  /**
   * Convert text to speech using ElevenLabs
   */
  textToSpeech = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, voiceId, settings } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ 
          success: false, 
          error: 'Text is required and must be a string' 
        });
        return;
      }

      if (text.length > 5000) {
        res.status(400).json({ 
          success: false, 
          error: 'Text too long. Maximum 5000 characters allowed.' 
        });
        return;
      }

      // Generate audio
      const audioBuffer = await this.elevenLabsService.textToSpeech(
        text,
        voiceId,
        settings
      );

      // Set response headers for audio
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': 'attachment; filename="speech.mp3"',
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error('Error in text-to-speech:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Text-to-speech conversion failed',
      });
    }
  };

  /**
   * Convert text to speech and save as file
   */
  textToSpeechFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, voiceId, settings, filename } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ 
          success: false, 
          error: 'Text is required and must be a string' 
        });
        return;
      }

      const audioFilename = filename || `tts_${Date.now()}`;
      
      // Generate and save audio file
      const filePath = await this.elevenLabsService.textToSpeechFile(
        text,
        audioFilename,
        voiceId,
        { ...settings, outputDir: './uploads/audio/tts' }
      );

      res.json({
        success: true,
        data: {
          filePath,
          filename: `${audioFilename}.mp3`,
          url: `/api/voice/audio/${path.basename(filePath)}`,
        },
      });
    } catch (error) {
      console.error('Error in text-to-speech file generation:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Text-to-speech file generation failed',
      });
    }
  };

  /**
   * Convert speech to text using Whisper
   */
  speechToText = async (req: Request, res: Response): Promise<void> => {
    try {
      const audioFile = req.file;

      if (!audioFile) {
        res.status(400).json({ 
          success: false, 
          error: 'Audio file is required' 
        });
        return;
      }

      // Validate audio file
      const validation = await this.whisperService.validateAudioFile(audioFile.path);
      if (!validation.isValid) {
        res.status(400).json({ 
          success: false, 
          error: validation.error 
        });
        return;
      }

      // Transcribe audio
      const transcription = await this.whisperService.speechToText(audioFile.path);

      // Clean up uploaded file
      try {
        fs.unlinkSync(audioFile.path);
      } catch (cleanupError) {
        console.warn('Could not delete temporary audio file:', cleanupError);
      }

      res.json({
        success: true,
        data: {
          transcription,
          fileSize: validation.fileSize,
        },
      });
    } catch (error) {
      console.error('Error in speech-to-text:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Speech-to-text conversion failed',
      });
    }
  };

  /**
   * Convert speech to text with detailed response
   */
  speechToTextVerbose = async (req: Request, res: Response): Promise<void> => {
    try {
      const audioFile = req.file;
      const { language, prompt } = req.body;

      if (!audioFile) {
        res.status(400).json({ 
          success: false, 
          error: 'Audio file is required' 
        });
        return;
      }

      // Validate audio file
      const validation = await this.whisperService.validateAudioFile(audioFile.path);
      if (!validation.isValid) {
        res.status(400).json({ 
          success: false, 
          error: validation.error 
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
        fs.unlinkSync(audioFile.path);
      } catch (cleanupError) {
        console.warn('Could not delete temporary audio file:', cleanupError);
      }

      res.json({
        success: true,
        data: {
          ...result,
          fileSize: validation.fileSize,
        },
      });
    } catch (error) {
      console.error('Error in verbose speech-to-text:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Verbose speech-to-text conversion failed',
      });
    }
  };

  /**
   * Get available voices from ElevenLabs
   */
  getVoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const voices = await this.elevenLabsService.getVoices();

      res.json({
        success: true,
        data: voices,
      });
    } catch (error) {
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
  getVoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { voiceId } = req.params;

      if (!voiceId) {
        res.status(400).json({ 
          success: false, 
          error: 'Voice ID is required' 
        });
        return;
      }

      const voice = await this.elevenLabsService.getVoice(voiceId);

      res.json({
        success: true,
        data: voice,
      });
    } catch (error) {
      console.error('Error fetching voice details:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch voice details',
      });
    }
  };

  /**
   * Get voice settings
   */
  getVoiceSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { voiceId } = req.params;

      if (!voiceId) {
        res.status(400).json({ 
          success: false, 
          error: 'Voice ID is required' 
        });
        return;
      }

      const settings = await this.elevenLabsService.getVoiceSettings(voiceId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error('Error fetching voice settings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch voice settings',
      });
    }
  };

  /**
   * Update voice settings
   */
  updateVoiceSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { voiceId } = req.params;
      const { stability, similarityBoost, style, useSpeakerBoost } = req.body;

      if (!voiceId) {
        res.status(400).json({ 
          success: false, 
          error: 'Voice ID is required' 
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
    } catch (error) {
      console.error('Error updating voice settings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update voice settings',
      });
    }
  };

  /**
   * Serve audio files
   */
  serveAudioFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      const audioPath = path.join('./uploads/audio', filename);

      if (!fs.existsSync(audioPath)) {
        res.status(404).json({ 
          success: false, 
          error: 'Audio file not found' 
        });
        return;
      }

      const stat = fs.statSync(audioPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Handle range requests for audio streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(audioPath, { start, end });
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // Serve entire file
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
        };
        
        res.writeHead(200, head);
        fs.createReadStream(audioPath).pipe(res);
      }
    } catch (error) {
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
  getAudioRequirements = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
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
  getUserInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const userInfo = await this.elevenLabsService.getUserInfo();

      res.json({
        success: true,
        data: userInfo,
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user info',
      });
    }
  };
}
