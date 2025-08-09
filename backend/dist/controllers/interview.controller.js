"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewController = void 0;
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("../lib/prisma"));
const openai_service_1 = require("../services/openai.service");
const elevenlabs_service_1 = require("../services/elevenlabs.service");
const whisper_service_1 = require("../services/whisper.service");
class InterviewController {
    constructor(openaiApiKey, elevenLabsApiKey, elevenLabsVoiceId) {
        /**
         * Start new interview session
         */
        this.startInterview = async (req, res) => {
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
                const resume = await prisma_1.default.resume.findUnique({
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
                const parsedData = resume.parsedData;
                if (!parsedData || !parsedData.workExperience) {
                    res.status(400).json({
                        success: false,
                        error: 'Resume data is not properly parsed or missing work experience',
                    });
                    return;
                }
                const questions = await this.openaiService.generateInterviewQuestions(parsedData.workExperience);
                // Create interview session
                const sessionId = (0, uuid_1.v4)();
                const session = await prisma_1.default.interviewSession.create({
                    data: {
                        id: sessionId,
                        userId: userId,
                        resumeId: resumeId,
                        status: 'pending',
                        startedAt: new Date(),
                    },
                });
                // Create interview questions
                const createdQuestions = [];
                for (let i = 0; i < questions.length; i++) {
                    const question = await prisma_1.default.interviewQuestion.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            sessionId: sessionId,
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
            }
            catch (error) {
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
        this.submitResponse = async (req, res) => {
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
                const question = await prisma_1.default.interviewQuestion.findUnique({
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
                let finalResponseText = responseText;
                let audioFilePath;
                // Process audio if provided
                if (audioFile) {
                    audioFilePath = audioFile.path;
                    // Transcribe audio to text using Whisper
                    try {
                        const transcription = await this.whisperService.speechToText(audioFilePath);
                        if (transcription && transcription.trim().length > 0) {
                            finalResponseText = transcription;
                        }
                    }
                    catch (transcriptionError) {
                        console.warn('Audio transcription failed:', transcriptionError);
                        // Continue with text response if audio transcription fails
                    }
                }
                if (!finalResponseText || finalResponseText.trim().length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'Response text is required (either provided or transcribed from audio)',
                    });
                    return;
                }
                // Get resume data for context
                const resume = await prisma_1.default.resume.findUnique({
                    where: { id: question.session.resumeId },
                });
                if (!resume || !resume.parsedData) {
                    res.status(400).json({
                        success: false,
                        error: 'Resume data not found or not properly parsed',
                    });
                    return;
                }
                const parsedData = resume.parsedData;
                // Evaluate response using OpenAI
                const evaluation = await this.openaiService.evaluateResponse(question.questionText, finalResponseText, [], parsedData.workExperience);
                // Save response to database
                const response = await prisma_1.default.interviewResponse.create({
                    data: {
                        id: (0, uuid_1.v4)(),
                        questionId: questionId,
                        responseText: finalResponseText,
                        audioFilePath,
                        responseTimeMs: 0, // Could be calculated from frontend
                        score: evaluation.overallScore,
                        feedback: evaluation.detailedFeedback,
                        aiEvaluation: evaluation,
                    },
                });
                // Check if this is the last question
                const totalQuestions = await prisma_1.default.interviewQuestion.count({
                    where: { sessionId },
                });
                const answeredQuestions = await prisma_1.default.interviewResponse.count({
                    where: {
                        question: {
                            sessionId,
                        },
                    },
                });
                let nextQuestion = null;
                if (answeredQuestions < totalQuestions) {
                    // Get next unanswered question
                    const unansweredQuestion = await prisma_1.default.interviewQuestion.findFirst({
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
            }
            catch (error) {
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
        this.completeInterview = async (req, res) => {
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
                const responses = await prisma_1.default.interviewResponse.findMany({
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
                const totalScore = responses.reduce((sum, response) => sum + (response.score || 0), 0);
                const averageScore = totalScore / responses.length;
                // Get resume data for context
                const session = await prisma_1.default.interviewSession.findUnique({
                    where: { id: sessionId },
                    include: { resume: true },
                });
                const parsedData = session?.resume
                    .parsedData || { workExperience: [] };
                const overallFeedback = await this.openaiService.generateOverallFeedback(responses.map((r) => ({
                    question: r.question.questionText,
                    response: r.responseText,
                    evaluation: r.aiEvaluation,
                })), parsedData);
                // Update session status
                const updatedSession = await prisma_1.default.interviewSession.update({
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
            }
            catch (error) {
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
        this.getSession = async (req, res) => {
            try {
                const sessionId = req.params.sessionId;
                if (!sessionId) {
                    res.status(400).json({
                        success: false,
                        error: 'Session ID is required',
                    });
                    return;
                }
                const session = await prisma_1.default.interviewSession.findUnique({
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
            }
            catch (error) {
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
        this.getUserSessions = async (req, res) => {
            try {
                const userId = req.userId || req.params.userId;
                if (!userId) {
                    res.status(400).json({
                        success: false,
                        error: 'User ID is required',
                    });
                    return;
                }
                const sessions = await prisma_1.default.interviewSession.findMany({
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
            }
            catch (error) {
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
        this.deleteSession = async (req, res) => {
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
                const session = await prisma_1.default.interviewSession.findUnique({
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
                await prisma_1.default.interviewSession.delete({
                    where: { id: sessionId },
                });
                res.json({
                    success: true,
                    message: 'Interview session deleted successfully',
                });
            }
            catch (error) {
                console.error('Delete session error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete interview session',
                });
            }
        };
        /**
         * Generate personalized technical questions based on work experience
         */
        this.generateQuestions = async (req, res) => {
            try {
                const { workExperience, questionType = 'technical' } = req.body;
                if (!workExperience || !Array.isArray(workExperience)) {
                    res.status(400).json({
                        success: false,
                        error: 'Work experience array is required',
                    });
                    return;
                }
                if (workExperience.length === 0) {
                    res.status(400).json({
                        success: false,
                        error: 'At least one work experience entry is required',
                    });
                    return;
                }
                // Generate 5 technical questions based on user's work experience
                console.log('Generating questions for work experience:', workExperience);
                const generatedQuestions = await this.openaiService.generateInterviewQuestions(workExperience);
                // Format questions for frontend
                const questions = generatedQuestions.map((q, index) => ({
                    id: (0, uuid_1.v4)(),
                    questionText: q.questionText,
                    questionType: q.questionType,
                    orderIndex: index + 1,
                    isRequired: q.isRequired || true,
                }));
                res.json({
                    success: true,
                    data: questions,
                });
            }
            catch (error) {
                console.error('Generate questions error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to generate interview questions',
                });
            }
        };
        this.openaiService = new openai_service_1.OpenAIService(openaiApiKey);
        this.elevenLabsService = new elevenlabs_service_1.ElevenLabsService(elevenLabsApiKey, elevenLabsVoiceId);
        this.whisperService = new whisper_service_1.WhisperService(openaiApiKey);
    }
}
exports.InterviewController = InterviewController;
//# sourceMappingURL=interview.controller.js.map