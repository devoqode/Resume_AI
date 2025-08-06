import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';


export class FileProcessorService {
  /**
   * Extract text from various file formats
   */
  async extractTextFromFile(filePath: string): Promise<string> {
    const fileExtension = path.extname(filePath).toLowerCase();

    try {
      switch (fileExtension) {
        case '.pdf':
          return await this.extractTextFromPDF(filePath);
        case '.doc':
        case '.docx':
          return await this.extractTextFromDOCX(filePath);
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      console.error(`Error extracting text from file ${filePath}:`, error);
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      return pdfData.text;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from DOC/DOCX files
   */
  private async extractTextFromDOCX(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate file format and size
   */
  validateFile(filePath: string, maxSizeBytes: number = 10 * 1024 * 1024): {
    isValid: boolean;
    error?: string;
    fileSize?: number;
  } {
    try {
      if (!fs.existsSync(filePath)) {
        return { isValid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      const supportedFormats = ['.pdf', '.doc', '.docx'];

      if (!supportedFormats.includes(fileExtension)) {
        return {
          isValid: false,
          error: `Unsupported file format: ${fileExtension}. Supported formats: ${supportedFormats.join(', ')}`,
          fileSize: stats.size,
        };
      }

      if (stats.size > maxSizeBytes) {
        return {
          isValid: false,
          error: `File size ${stats.size} bytes exceeds maximum allowed size of ${maxSizeBytes} bytes`,
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

  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): {
    name: string;
    extension: string;
    size: number;
    createdAt: Date;
    modifiedAt: Date;
  } {
    const stats = fs.statSync(filePath);
    const parsedPath = path.parse(filePath);

    return {
      name: parsedPath.base,
      extension: parsedPath.ext,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  }

  /**
   * Clean up extracted text (remove extra whitespace, normalize line endings)
   */
  cleanExtractedText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Handle remaining carriage returns
      .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with double line break
      .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Extract and clean text from file
   */
  async processResumeFile(filePath: string): Promise<{
    originalText: string;
    cleanedText: string;
    metadata: {
      name: string;
      extension: string;
      size: number;
      createdAt: Date;
      modifiedAt: Date;
    };
  }> {
    // Validate file first
    const validation = this.validateFile(filePath);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Extract text
    const originalText = await this.extractTextFromFile(filePath);
    const cleanedText = this.cleanExtractedText(originalText);
    const metadata = this.getFileMetadata(filePath);

    return {
      originalText,
      cleanedText,
      metadata,
    };
  }

  /**
   * Check if file is a supported format
   */
  isSupportedFormat(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase();
    return ['.pdf', '.doc', '.docx'].includes(extension);
  }

  /**
   * Get supported file formats
   */
  getSupportedFormats(): {
    formats: string[];
    maxSize: number;
    description: string;
  } {
    return {
      formats: ['.pdf', '.doc', '.docx'],
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'Supported formats: PDF, DOC, DOCX. Maximum file size: 10MB',
    };
  }

  /**
   * Estimate text extraction quality
   */
  estimateExtractionQuality(text: string): {
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // Check text length
    if (text.length < 100) {
      issues.push('Very short text extracted');
      score -= 30;
    }

    // Check for common extraction artifacts
    const artifactPatterns = [
      /[^\w\s.,!?;:()\-'"]/g, // Non-standard characters
      /(.)\1{5,}/g, // Repeated characters
      /\s{5,}/g, // Excessive whitespace
    ];

    artifactPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 3) {
        const artifactTypes = ['Special characters', 'Repeated characters', 'Excessive whitespace'];
        issues.push(`Multiple ${artifactTypes[index]} detected`);
        score -= 15;
      }
    });

    // Check for structured content (likely good extraction)
    const structurePatterns = [
      /email/i,
      /phone/i,
      /experience/i,
      /education/i,
      /skills/i,
    ];

    const structureMatches = structurePatterns.filter(pattern => pattern.test(text)).length;
    if (structureMatches < 2) {
      issues.push('Limited structured content detected');
      score -= 20;
    }

    // Determine quality level
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 85) quality = 'excellent';
    else if (score >= 70) quality = 'good';
    else if (score >= 50) quality = 'fair';
    else quality = 'poor';

    return {
      quality,
      score: Math.max(0, score),
      issues,
    };
  }
}
