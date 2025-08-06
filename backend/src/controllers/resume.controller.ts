import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import prisma from '../lib/prisma';
import { OpenAIService } from '../services/openai.service';
import { FileProcessorService } from '../services/fileProcessor.service';
import { AuthenticatedRequest } from '../types';

export class ResumeController {
  private openaiService: OpenAIService;
  private fileProcessor: FileProcessorService;

  constructor(openaiApiKey: string) {
    this.openaiService = new OpenAIService(openaiApiKey);
    this.fileProcessor = new FileProcessorService();
  }

  /**
   * Upload and parse resume
   */
  uploadResume = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const userId = req.userId || req.body.userId;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const filePath = req.file.path;
      const filename = req.file.originalname;

      // Process the uploaded file
      try {
        const extractedText =
          await this.fileProcessor.extractTextFromFile(filePath);

        if (!extractedText || extractedText.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: 'Could not extract text from the uploaded file',
          });
          return;
        }

        // Parse the resume using OpenAI
        const parsedData =
          await this.openaiService.parseResumeText(extractedText);

        // Save resume to database using Prisma
        const resume = await prisma.resume.create({
          data: {
            id: uuidv4(),
            userId: userId as string,
            filename,
            filePath,
            originalText: extractedText,
            parsedData: parsedData as any,
          },
        });

        res.status(201).json({
          success: true,
          data: {
            id: resume.id,
            filename: resume.filename,
            uploadedAt: resume.uploadedAt,
            parsedData: resume.parsedData,
          },
        });
      } catch (processingError) {
        console.error('Resume processing error:', processingError);
        res.status(500).json({
          success: false,
          error: 'Failed to process resume file',
        });
      }
    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload resume',
      });
    }
  };

  /**
   * Get user's resumes
   */
  getResumes = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.userId || req.params.userId;
      if (!userId) {
        res.status(400).json({ success: false, error: 'User ID is required' });
        return;
      }

      const resumes = await prisma.resume.findMany({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          filename: true,
          uploadedAt: true,
          parsedData: true,
        },
      });

      res.json({
        success: true,
        data: resumes,
      });
    } catch (error) {
      console.error('Get resumes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resumes',
      });
    }
  };

  /**
   * Get single resume
   */
  getResume = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const resumeId = req.params.resumeId;
      if (!resumeId) {
        res
          .status(400)
          .json({ success: false, error: 'Resume ID is required' });
        return;
      }

      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!resume) {
        res.status(404).json({
          success: false,
          error: 'Resume not found',
        });
        return;
      }

      res.json({
        success: true,
        data: resume,
      });
    } catch (error) {
      console.error('Get resume error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resume',
      });
    }
  };

  /**
   * Delete resume
   */
  deleteResume = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const resumeId = req.params.resumeId;
      if (!resumeId) {
        res
          .status(400)
          .json({ success: false, error: 'Resume ID is required' });
        return;
      }

      // Get resume to delete associated file
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
      });

      if (!resume) {
        res.status(404).json({
          success: false,
          error: 'Resume not found',
        });
        return;
      }

      // Delete from database
      await prisma.resume.delete({
        where: { id: resumeId },
      });

      // Delete file from filesystem
      if (resume.filePath && fs.existsSync(resume.filePath)) {
        try {
          fs.unlinkSync(resume.filePath);
        } catch (fileError) {
          console.warn('Failed to delete resume file:', fileError);
        }
      }

      res.json({
        success: true,
        message: 'Resume deleted successfully',
      });
    } catch (error) {
      console.error('Delete resume error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete resume',
      });
    }
  };

  /**
   * Reparse existing resume
   */
  reparseResume = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const resumeId = req.params.resumeId;
      if (!resumeId) {
        res
          .status(400)
          .json({ success: false, error: 'Resume ID is required' });
        return;
      }

      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
      });

      if (!resume) {
        res.status(404).json({
          success: false,
          error: 'Resume not found',
        });
        return;
      }

      // Re-parse the resume using OpenAI
      const newParsedData = await this.openaiService.parseResumeText(
        resume.originalText
      );

      // Update resume with new parsed data
      const updatedResume = await prisma.resume.update({
        where: { id: resumeId },
        data: {
          parsedData: newParsedData as any,
        },
      });

      res.json({
        success: true,
        data: {
          id: updatedResume.id,
          filename: updatedResume.filename,
          uploadedAt: updatedResume.uploadedAt,
          parsedData: updatedResume.parsedData,
        },
      });
    } catch (error) {
      console.error('Reparse resume error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reparse resume',
      });
    }
  };

  /**
   * Get user's resume parsing statistics
   */
  getParsingStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.userId || req.params.userId;

      // Get resume stats
      const resumeStats = await prisma.resume.aggregate({
        where: userId ? { userId } : {},
        _count: { id: true },
      });

      // Get latest resume upload
      const latestResume = await prisma.resume.findFirst({
        where: userId ? { userId } : {},
        orderBy: { uploadedAt: 'desc' },
        select: { uploadedAt: true },
      });

      // Get average text length (approximate)
      const resumes = await prisma.resume.findMany({
        where: userId ? { userId } : {},
        select: { originalText: true },
      });

      const avgTextLength =
        resumes.length > 0
          ? Math.round(
              resumes.reduce((sum, r) => sum + r.originalText.length, 0) /
                resumes.length
            )
          : 0;

      // Get interview stats
      const interviewStats = await prisma.interviewSession.aggregate({
        where: userId ? { userId } : {},
        _count: { id: true },
        _avg: { overallScore: true },
      });

      res.json({
        success: true,
        data: {
          totalResumes: resumeStats._count.id || 0,
          totalInterviews: interviewStats._count.id || 0,
          averageScore: Math.round(interviewStats._avg.overallScore || 0),
          averageTextLength: avgTextLength,
          lastActivity: latestResume?.uploadedAt || null,
        },
      });
    } catch (error) {
      console.error('Get parsing stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  };
}
