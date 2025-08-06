import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { OpenAIService } from '../services/openai.service';
import { ElevenLabsService } from '../services/elevenlabs.service';
import { WhisperService } from '../services/whisper.service';
import { ParsedResumeData, AIEvaluation, AuthenticatedRequest } from '../types';

export class InterviewController {
  private openaiService: OpenAIService;
  private elevenLabsService: ElevenLabsService;
  private whisperService: WhisperService;

  constructor(
    openaiApiKey: string,
    elevenLabsApiKey: string,
    elevenLabsVoiceId: string
  ) {
    this.openaiService = new OpenAIService(openaiApiKey);
    this.elevenLabsService = new ElevenLabsService(
      elevenLabsApiKey,
      elevenLabsVoiceId
    );
    this.whisperService = new WhisperService(openaiApiKey);
  }

  /**
   * Start new interview session
   */
  startInterview = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { userId, resumeId } = req.body;

      if (!userId || !resumeId) {
        res.status(400).json({
          success: false,
          error: 'User ID and Resume ID are required',
        });
        return;
      }

      // Verify resume exists
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
        include: {
          user: true,
        },
      });

      if (!resume) {
        res.status(404).json({
          success: false,
          error: 'Resume not found',
        });
        return;
      }

      // Generate interview questions based on resume
      const parsedData = resume.parsedData as unknown as ParsedResumeData;
      if (!parsedData || !parsedData.workExperience) {
        res.status(400).json({
          success: false,
          error:
            'Resume data is not properly parsed or missing work experience',
        });
        return;
      }
      const questions = await this.openaiService.generateInterviewQuestions(
        parsedData.workExperience
      );

      // Create interview session
      const sessionId = uuidv4();
      const session = await prisma.interviewSession.create({
        data: {
          id: sessionId,
          userId: userId as string,
          resumeId: resumeId as string,
          status: 'pending',
          startedAt: new Date(),
        },
      });

      // Create interview questions
      const createdQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const question = await prisma.interviewQuestion.create({
          data: {
            id: uuidv4(),
            sessionId: sessionId as string,
            questionText: questions[i].questionText,
            questionType: questions[i].questionType || 'general',
            orderIndex: i,
            isRequired: questions[i].isRequired || true,
          },
        });
        createdQuestions.push(question);
      }

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          questions: createdQuestions,
          totalQuestions: createdQuestions.length,
        },
      });
    } catch (error) {
      console.error('Start interview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start interview session',
      });
    }
  };

  /**
   * Submit interview response
   */
  submitResponse = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { sessionId, questionId, responseText } = req.body;
      const audioFile = req.file;

      if (!sessionId || !questionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID and Question ID are required',
        });
        return;
      }

      // Verify session and question exist
      const question = await prisma.interviewQuestion.findUnique({
        where: { id: questionId },
        include: {
          session: true,
        },
      });

      if (!question) {
        res.status(404).json({
          success: false,
          error: 'Question not found',
        });
        return;
      }

      let finalResponseText = responseText as string;
      let audioFilePath: string | undefined;

      // Process audio if provided
      if (audioFile) {
        audioFilePath = audioFile.path;

        // Transcribe audio to text using Whisper
        try {
          const transcription = await this.whisperService.speechToText(
            audioFilePath!
          );
          if (transcription && transcription.trim().length > 0) {
            finalResponseText = transcription;
          }
        } catch (transcriptionError) {
          console.warn('Audio transcription failed:', transcriptionError);
          // Continue with text response if audio transcription fails
        }
      }

      if (!finalResponseText || finalResponseText.trim().length === 0) {
        res.status(400).json({
          success: false,
          error:
            'Response text is required (either provided or transcribed from audio)',
        });
        return;
      }

      // Get resume data for context
      const resume = await prisma.resume.findUnique({
        where: { id: (question as any).session.resumeId },
      });

      if (!resume || !resume.parsedData) {
        res.status(400).json({
          success: false,
          error: 'Resume data not found or not properly parsed',
        });
        return;
      }

      const parsedData = resume.parsedData as unknown as ParsedResumeData;

      // Evaluate response using OpenAI
      const evaluation = await this.openaiService.evaluateResponse(
        question.questionText,
        finalResponseText,
        [],
        parsedData.workExperience
      );

      // Save response to database
      const response = await prisma.interviewResponse.create({
        data: {
          id: uuidv4(),
          questionId: questionId as string,
          responseText: finalResponseText,
          audioFilePath,
          responseTimeMs: 0, // Could be calculated from frontend
          score: evaluation.overallScore,
          feedback: evaluation.detailedFeedback,
          aiEvaluation: evaluation as any,
        },
      });

      // Check if this is the last question
      const totalQuestions = await prisma.interviewQuestion.count({
        where: { sessionId },
      });

      const answeredQuestions = await prisma.interviewResponse.count({
        where: {
          question: {
            sessionId,
          },
        },
      });

      let nextQuestion = null;
      if (answeredQuestions < totalQuestions) {
        // Get next unanswered question
        const unansweredQuestion = await prisma.interviewQuestion.findFirst({
          where: {
            sessionId,
            responses: {
              none: {},
            },
          },
          orderBy: { orderIndex: 'asc' },
        });

        nextQuestion = unansweredQuestion;
      }

      res.json({
        success: true,
        data: {
          responseId: response.id,
          evaluation,
          nextQuestion,
          isLastQuestion: answeredQuestions >= totalQuestions,
        },
      });
    } catch (error) {
      console.error('Submit response error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit response',
      });
    }
  };

  /**
   * Complete interview session
   */
  completeInterview = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const sessionId = req.params.sessionId;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
        return;
      }

      // Get all responses for the session
      const responses = await prisma.interviewResponse.findMany({
        where: {
          question: {
            sessionId,
          },
        },
        include: {
          question: true,
        },
      });

      if (responses.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No responses found for this session',
        });
        return;
      }

      // Calculate overall score and generate overall feedback
      const totalScore = responses.reduce(
        (sum, response) => sum + (response.score || 0),
        0
      );
      const averageScore = totalScore / responses.length;

      // Get resume data for context
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { resume: true },
      });
      const parsedData = (session?.resume
        .parsedData as unknown as ParsedResumeData) || { workExperience: [] };

      const overallFeedback = await this.openaiService.generateOverallFeedback(
        responses.map((r) => ({
          question: r.question.questionText,
          response: r.responseText,
          evaluation: r.aiEvaluation as unknown as AIEvaluation,
        })),
        parsedData
      );

      // Update session status
      const updatedSession = await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          overallScore: averageScore,
          feedback: overallFeedback.feedback,
        },
        include: {
          questions: {
            include: {
              responses: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: updatedSession,
      });
    } catch (error) {
      console.error('Complete interview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete interview session',
      });
    }
  };

  /**
   * Get interview session details
   */
  getSession = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const sessionId = req.params.sessionId;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
        return;
      }

      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          resume: {
            select: {
              id: true,
              filename: true,
              parsedData: true,
            },
          },
          questions: {
            include: {
              responses: true,
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Interview session not found',
        });
        return;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interview session',
      });
    }
  };

  /**
   * Get all interview sessions for a user
   */
  getUserSessions = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.userId || req.params.userId;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const sessions = await prisma.interviewSession.findMany({
        where: { userId },
        include: {
          resume: {
            select: {
              id: true,
              filename: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interview sessions',
      });
    }
  };

  /**
   * Delete interview session
   */
  deleteSession = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const sessionId = req.params.sessionId;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
        return;
      }

      // Verify session exists
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Interview session not found',
        });
        return;
      }

      // Delete session (cascades to questions and responses)
      await prisma.interviewSession.delete({
        where: { id: sessionId },
      });

      res.json({
        success: true,
        message: 'Interview session deleted successfully',
      });
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete interview session',
      });
    }
  };
}
