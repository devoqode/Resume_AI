import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs/promises';
import path from 'path';

export class ElevenLabsService {
  private client: ElevenLabsClient;
  private defaultVoiceId: string;

  constructor(apiKey: string, defaultVoiceId: string = 'pNInz6obpgDQGcFmaJgB') {
    this.client = new ElevenLabsClient({ apiKey });
    this.defaultVoiceId = defaultVoiceId;
  }

  /**
   * Convert text to speech and return audio buffer
   */
  async textToSpeech(
    text: string,
    voiceId?: string,
    options?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ): Promise<Buffer> {
    try {
      const audioStream = await this.client.textToSpeech.convert(voiceId || this.defaultVoiceId, {
        text: text,
        modelId: 'eleven_multilingual_v2',
        voiceSettings: {
          stability: options?.stability ?? 0.5,
          similarityBoost: options?.similarityBoost ?? 0.8,
          style: options?.style ?? 0.0,
          useSpeakerBoost: options?.useSpeakerBoost ?? true,
        },
      });

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
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
    } catch (error) {
      console.error('Error in text-to-speech conversion:', error);
      throw new Error(`TTS conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save audio buffer to file and return file path
   */
  async saveAudioToFile(audioBuffer: Buffer, filename: string, outputDir: string = './uploads/audio'): Promise<string> {
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      const filePath = path.join(outputDir, `${filename}.mp3`);
      await fs.writeFile(filePath, audioBuffer);
      
      return filePath;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw new Error(`Failed to save audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert text to speech and save to file
   */
  async textToSpeechFile(
    text: string,
    filename: string,
    voiceId?: string,
    options?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
      outputDir?: string;
    }
  ): Promise<string> {
    const audioBuffer = await this.textToSpeech(text, voiceId, options);
    return await this.saveAudioToFile(audioBuffer, filename, options?.outputDir);
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await this.client.voices.search();
      return response.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw new Error(`Failed to fetch voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific voice details
   */
  async getVoice(voiceId: string): Promise<any> {
    try {
      const response = await this.client.voices.get(voiceId);
      return response;
    } catch (error) {
      console.error('Error fetching voice details:', error);
      throw new Error(`Failed to fetch voice details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a custom voice from audio samples
   * Note: This is a premium feature that requires audio samples
   */
  async createCustomVoice(
    name: string,
    description: string,
    audioFiles: string[]
  ): Promise<string> {
    try {
      // Note: This method may need to be updated based on the actual ElevenLabs API
      throw new Error('Custom voice creation not implemented - please check ElevenLabs API documentation');
    } catch (error) {
      console.error('Error creating custom voice:', error);
      throw new Error(`Failed to create custom voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Speech to text conversion using ElevenLabs (if available)
   * Note: ElevenLabs primarily focuses on TTS. For STT, you might want to use OpenAI Whisper or other services
   */
  async speechToText(audioFilePath: string): Promise<string> {
    try {
      // ElevenLabs doesn't have native STT, so we'll use a placeholder
      // In a real implementation, you might use OpenAI Whisper API or other STT services
      throw new Error('Speech-to-text not implemented with ElevenLabs. Consider using OpenAI Whisper API.');
    } catch (error) {
      console.error('Error in speech-to-text conversion:', error);
      throw error;
    }
  }

  /**
   * Get user subscription info and limits
   */
  async getUserInfo(): Promise<any> {
    try {
      const response = await this.client.user.get();
      return response;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new Error(`Failed to fetch user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get voice settings for a specific voice
   */
  async getVoiceSettings(voiceId: string): Promise<any> {
    try {
      const response = await this.client.voices.settings.get(voiceId);
      return response;
    } catch (error) {
      console.error('Error fetching voice settings:', error);
      throw new Error(`Failed to fetch voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update voice settings for a specific voice
   */
  async updateVoiceSettings(
    voiceId: string,
    settings: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ): Promise<void> {
    try {
      // Note: Voice settings editing may need to be implemented based on actual ElevenLabs API
      throw new Error('Voice settings update not implemented - please check ElevenLabs API documentation');
    } catch (error) {
      console.error('Error updating voice settings:', error);
      throw new Error(`Failed to update voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate interview question audio files in batch
   */
  async generateInterviewAudio(
    questions: Array<{ id: string; text: string }>,
    voiceId?: string,
    outputDir?: string
  ): Promise<Array<{ questionId: string; audioPath: string }>> {
    const results = [];
    
    for (const question of questions) {
      try {
        const filename = `question_${question.id}`;
        const audioPath = await this.textToSpeechFile(
          question.text,
          filename,
          voiceId,
          { outputDir }
        );
        
        results.push({
          questionId: question.id,
          audioPath,
        });
      } catch (error) {
        console.error(`Error generating audio for question ${question.id}:`, error);
        // Continue with other questions even if one fails
      }
    }
    
    return results;
  }
}
