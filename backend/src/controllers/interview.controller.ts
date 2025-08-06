import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../models/database';
import { OpenAIService } from '../services/openai.service';
import { ElevenLabsService } from '../services/elevenlabs.service';
import { WhisperService } from '../services/whisper.service';
import { InterviewSession, InterviewQuestion, InterviewResponse, ParsedResumeData, AIEvaluation, AuthenticatedRequest } from '../types';

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
    this.elevenLabsService = new ElevenLabsService(elevenLabsApiKey, elevenLabsVoiceId);
    this.whisperService = new WhisperService(openaiApiKey);
  }

  /**
   * Start a new interview session
   */
  startInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { resumeId } = req.body;
      const userId = req.userId || req.body.userId;

      if (!userId || !resumeId) {
        res.status(400).json({ 
          success: false, 
          error: 'User ID and Resume ID are required' 
        });
        return;
      }

      const db = getDatabase();
      
      // Get resume data
      const resume = await db.get(
        `SELECT parsed_data FROM resumes WHERE id = ? AND user_id = ?`,
        [resumeId, userId]
      );

      if (!resume) {
        res.status(404).json({ 
          success: false, 
          error: 'Resume not found' 
        });
        return;
      }

      const parsedData: ParsedResumeData = JSON.parse(resume.parsed_data);
      
      // Generate interview questions based on work experience
      const questions = await this.openaiService.generateInterviewQuestions(
        parsedData.workExperience || []
      );

      // Create interview session
      const sessionId = uuidv4();
      await db.run(
        `INSERT INTO interview_sessions (id, user_id, resume_id, status, started_at, created_at)
         VALUES (?, ?, ?, 'in_progress', datetime('now'), datetime('now'))`,
        [sessionId, userId, resumeId]
      );

      // Save questions
      for (let i = 0; i < questions.length; i++) {
        const questionId = uuidv4();
        questions[i].id = questionId;
        questions[i].sessionId = sessionId;

        await db.run(
          `INSERT INTO interview_questions (id, session_id, question_text, question_type, order_index, is_required, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            questionId,
            sessionId,
            questions[i].questionText,
            questions[i].questionType,
            questions[i].orderIndex,
            questions[i].isRequired ? 1 : 0,
          ]
        );
      }

      // Generate audio files for questions
      const audioFiles = await this.elevenLabsService.generateInterviewAudio(
        questions.map(q => ({ id: q.id, text: q.questionText })),
        undefined, // Use default voice
        `./uploads/audio/session_${sessionId}`
      );

      res.status(201).json({
        success: true,
        data: {
          sessionId,
          questions: questions.map((q, index) => ({
            ...q,
            audioPath: audioFiles[index]?.audioPath,
          })),
          status: 'in_progress',
        },
      });
    } catch (error) {
      console.error('Error starting interview:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start interview',
      });
    }
  };

  /**
   * Submit response to interview question
   */
  submitResponse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId, questionId, responseText, responseTimeMs } = req.body;
      const audioFile = req.file;

      if (!sessionId || !questionId) {
        res.status(400).json({ 
          success: false, 
          error: 'Session ID and Question ID are required' 
        });
        return;
      }

      const db = getDatabase();
      
      // Verify session exists and is active
      const session = await db.get(
        `SELECT user_id, resume_id, status FROM interview_sessions WHERE id = ?`,
        [sessionId]
      );

      if (!session || session.status !== 'in_progress') {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid or inactive interview session' 
        });
        return;
      }

      // Get question details
      const question = await db.get(
        `SELECT question_text, question_type FROM interview_questions WHERE id = ?`,
        [questionId]
      );

      if (!question) {
        res.status(404).json({ 
          success: false, 
          error: 'Question not found' 
        });
        return;
      }

      let finalResponseText = responseText;
      let audioFilePath: string | undefined;

      // Process audio if provided
      if (audioFile) {
        audioFilePath = audioFile.path;
        
        // Transcribe audio to text using Whisper
        try {
          const transcription = await this.whisperService.speechToText(audioFilePath!);
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
          error: 'Response text is required (either provided or from audio transcription)' 
        });
        return;
      }

      // Get resume data for context
      const resume = await db.get(
        `SELECT parsed_data FROM resumes WHERE id = ?`,
        [session.resume_id]
      );
      const parsedData: ParsedResumeData = JSON.parse(resume.parsed_data);

      // Evaluate response with OpenAI
      const evaluation = await this.openaiService.evaluateResponse(
        question.question_text,
        finalResponseText,
        parsedData.skills || [],
        parsedData.workExperience || []
      );

      // Save response
      const responseId = uuidv4();
      await db.run(
        `INSERT INTO interview_responses 
         (id, question_id, response_text, audio_file_path, response_time_ms, score, feedback, ai_evaluation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          responseId,
          questionId,
          finalResponseText,
          audioFilePath,
          responseTimeMs || 0,
          evaluation.overallScore,
          evaluation.detailedFeedback,
          JSON.stringify(evaluation),
        ]
      );

      // Get next question if available
      const nextQuestion = await db.get(
        `SELECT iq.*, ir.id as response_id 
         FROM interview_questions iq 
         LEFT JOIN interview_responses ir ON iq.id = ir.question_id
         WHERE iq.session_id = ? AND ir.id IS NULL 
         ORDER BY iq.order_index ASC 
         LIMIT 1`,
        [sessionId]
      );

      res.json({
        success: true,
        data: {
          evaluation,
          nextQuestion: nextQuestion ? {
            id: nextQuestion.id,
            questionText: nextQuestion.question_text,
            questionType: nextQuestion.question_type,
            orderIndex: nextQuestion.order_index,
          } : null,
          isComplete: !nextQuestion,
        },
      });
    } catch (error) {
      console.error('Error submitting response:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit response',
      });
    }
  };

  /**
   * Complete interview session and get final results
   */
  completeInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ 
          success: false, 
          error: 'Session ID is required' 
        });
        return;
      }

      const db = getDatabase();

      // Get session with all questions and responses
      const sessionData = await db.all(`
        SELECT 
          iq.question_text,
          ir.response_text,
          ir.ai_evaluation,
          ir.score
        FROM interview_questions iq
        LEFT JOIN interview_responses ir ON iq.id = ir.question_id
        WHERE iq.session_id = ?
        ORDER BY iq.order_index ASC
      `, [sessionId]);

      if (sessionData.length === 0) {
        res.status(404).json({ 
          success: false, 
          error: 'Interview session not found' 
        });
        return;
      }

      // Check if all questions have responses
      const unansweredQuestions = sessionData.filter(item => !item.response_text);
      if (unansweredQuestions.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: `${unansweredQuestions.length} questions remain unanswered` 
        });
        return;
      }

      // Get resume data for overall feedback
      const session = await db.get(
        `SELECT resume_id FROM interview_sessions WHERE id = ?`,
        [sessionId]
      );

      const resume = await db.get(
        `SELECT parsed_data FROM resumes WHERE id = ?`,
        [session.resume_id]
      );
      const parsedData: ParsedResumeData = JSON.parse(resume.parsed_data);

      // Prepare data for overall feedback generation
      const questionResponses = sessionData.map(item => ({
        question: item.question_text,
        response: item.response_text,
        evaluation: JSON.parse(item.ai_evaluation) as AIEvaluation,
      }));

      // Generate overall feedback
      const overallFeedback = await this.openaiService.generateOverallFeedback(
        questionResponses,
        parsedData
      );

      // Update session with completion data
      await db.run(
        `UPDATE interview_sessions 
         SET status = 'completed', completed_at = datetime('now'), overall_score = ?, feedback = ?
         WHERE id = ?`,
        [overallFeedback.overallScore, overallFeedback.feedback, sessionId]
      );

      // Prepare final results
      const results = {
        sessionId,
        overallScore: overallFeedback.overallScore,
        questionResults: questionResponses.map(qr => ({
          question: qr.question,
          response: qr.response,
          score: qr.evaluation.overallScore,
          feedback: qr.evaluation.detailedFeedback,
        })),
        overallFeedback: overallFeedback.feedback,
        strengths: overallFeedback.strengths,
        improvementAreas: overallFeedback.improvements,
      };

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Error completing interview:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete interview',
      });
    }
  };

  /**
   * Get interview session details
   */
  getInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;

      if (!sessionId) {
        res.status(400).json({ 
          success: false, 
          error: 'Session ID is required' 
        });
        return;
      }

      const db = getDatabase();

      // Get session details
      const session = await db.get(
        `SELECT * FROM interview_sessions WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`,
        userId ? [sessionId, userId] : [sessionId]
      );

      if (!session) {
        res.status(404).json({ 
          success: false, 
          error: 'Interview session not found' 
        });
        return;
      }

      // Get questions and responses
      const questionsWithResponses = await db.all(`
        SELECT 
          iq.*,
          ir.id as response_id,
          ir.response_text,
          ir.score,
          ir.feedback,
          ir.ai_evaluation,
          ir.created_at as response_created_at
        FROM interview_questions iq
        LEFT JOIN interview_responses ir ON iq.id = ir.question_id
        WHERE iq.session_id = ?
        ORDER BY iq.order_index ASC
      `, [sessionId]);

      res.json({
        success: true,
        data: {
          session: {
            id: session.id,
            status: session.status,
            startedAt: session.started_at,
            completedAt: session.completed_at,
            overallScore: session.overall_score,
            feedback: session.feedback,
          },
          questions: questionsWithResponses.map(q => ({
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            orderIndex: q.order_index,
            response: q.response_text ? {
              id: q.response_id,
              responseText: q.response_text,
              score: q.score,
              feedback: q.feedback,
              aiEvaluation: q.ai_evaluation ? JSON.parse(q.ai_evaluation) : null,
              createdAt: q.response_created_at,
            } : null,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching interview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interview details',
      });
    }
  };

  /**
   * Get user's interview sessions
   */
  getInterviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.params.userId;
      const { status, limit = 10, offset = 0 } = req.query;

      if (!userId) {
        res.status(400).json({ 
          success: false, 
          error: 'User ID is required' 
        });
        return;
      }

      const db = getDatabase();
      
      let query = `
        SELECT 
          is.*,
          r.filename as resume_filename,
          COUNT(iq.id) as total_questions,
          COUNT(ir.id) as answered_questions
        FROM interview_sessions is
        LEFT JOIN resumes r ON is.resume_id = r.id
        LEFT JOIN interview_questions iq ON is.id = iq.session_id
        LEFT JOIN interview_responses ir ON iq.id = ir.question_id
        WHERE is.user_id = ?
      `;
      
      const params: any[] = [userId];
      
      if (status) {
        query += ` AND is.status = ?`;
        params.push(status);
      }
      
      query += ` GROUP BY is.id ORDER BY is.created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const interviews = await db.all(query, params);

      res.json({
        success: true,
        data: interviews.map(interview => ({
          id: interview.id,
          status: interview.status,
          startedAt: interview.started_at,
          completedAt: interview.completed_at,
          overallScore: interview.overall_score,
          resumeFilename: interview.resume_filename,
          progress: {
            totalQuestions: interview.total_questions,
            answeredQuestions: interview.answered_questions,
            completionPercentage: interview.total_questions > 0 
              ? Math.round((interview.answered_questions / interview.total_questions) * 100) 
              : 0,
          },
        })),
      });
    } catch (error) {
      console.error('Error fetching interviews:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch interviews',
      });
    }
  };

  /**
   * Delete interview session
   */
  deleteInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;

      if (!sessionId) {
        res.status(400).json({ 
          success: false, 
          error: 'Session ID is required' 
        });
        return;
      }

      const db = getDatabase();

      // Verify ownership
      const session = await db.get(
        `SELECT id FROM interview_sessions WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`,
        userId ? [sessionId, userId] : [sessionId]
      );

      if (!session) {
        res.status(404).json({ 
          success: false, 
          error: 'Interview session not found' 
        });
        return;
      }

      // Delete session (cascade will handle questions and responses)
      await db.run(`DELETE FROM interview_sessions WHERE id = ?`, [sessionId]);

      res.json({
        success: true,
        message: 'Interview session deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting interview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete interview session',
      });
    }
  };
}
