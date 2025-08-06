import OpenAI from 'openai';
import fs from 'fs';

export class WhisperService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Convert speech to text using OpenAI Whisper
   */
  async speechToText(
    audioFilePath: string,
    options?: {
      model?: 'whisper-1';
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
      temperature?: number;
    }
  ): Promise<string> {
    try {
      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Create a readable stream from the file
      const audioFile = fs.createReadStream(audioFilePath);

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: options?.model || 'whisper-1',
        language: options?.language,
        prompt: options?.prompt,
        response_format: options?.responseFormat || 'text',
        temperature: options?.temperature || 0,
      });

      if (options?.responseFormat === 'json' || options?.responseFormat === 'verbose_json') {
        return (response as any).text || '';
      }
      
      return response as unknown as string;
    } catch (error) {
      console.error('Error in speech-to-text conversion:', error);
      throw new Error(`STT conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert speech to text with detailed response including timestamps
   */
  async speechToTextVerbose(
    audioFilePath: string,
    options?: {
      language?: string;
      prompt?: string;
      temperature?: number;
    }
  ): Promise<{
    text: string;
    segments: Array<{
      id: number;
      seek: number;
      start: number;
      end: number;
      text: string;
      tokens: number[];
      temperature: number;
      avg_logprob: number;
      compression_ratio: number;
      no_speech_prob: number;
    }>;
    language: string;
    duration: number;
  }> {
    try {
      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Create a readable stream from the file
      const audioFile = fs.createReadStream(audioFilePath);

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options?.language,
        prompt: options?.prompt,
        response_format: 'verbose_json',
        temperature: options?.temperature || 0,
      });

      return response as any;
    } catch (error) {
      console.error('Error in verbose speech-to-text conversion:', error);
      throw new Error(`Verbose STT conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate audio in foreign language to English text
   */
  async translateToEnglish(
    audioFilePath: string,
    options?: {
      prompt?: string;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
      temperature?: number;
    }
  ): Promise<string> {
    try {
      // Check if file exists
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // Create a readable stream from the file
      const audioFile = fs.createReadStream(audioFilePath);

      const response = await this.openai.audio.translations.create({
        file: audioFile,
        model: 'whisper-1',
        prompt: options?.prompt,
        response_format: options?.responseFormat || 'text',
        temperature: options?.temperature || 0,
      });

      if (options?.responseFormat === 'json' || options?.responseFormat === 'verbose_json') {
        return (response as any).text || '';
      }
      
      return response as unknown as string;
    } catch (error) {
      console.error('Error in audio translation:', error);
      throw new Error(`Audio translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get supported audio formats and file size limits
   */
  getAudioRequirements(): {
    maxFileSize: number;
    supportedFormats: string[];
    maxDuration: number;
  } {
    return {
      maxFileSize: 25 * 1024 * 1024, // 25MB
      supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
      maxDuration: 2000, // seconds
    };
  }

  /**
   * Validate audio file before processing
   */
  async validateAudioFile(audioFilePath: string): Promise<{
    isValid: boolean;
    error?: string;
    fileSize?: number;
  }> {
    try {
      if (!fs.existsSync(audioFilePath)) {
        return { isValid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(audioFilePath);
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
    } catch (error) {
      return {
        isValid: false,
        error: `Error validating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
