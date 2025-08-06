"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const openai_service_1 = require("../services/openai.service");
const fileProcessor_service_1 = require("../services/fileProcessor.service");
class ResumeController {
    constructor(openaiApiKey) {
        /**
         * Upload and parse resume
         */
        this.uploadResume = async (req, res) => {
            try {
                if (!req.file) {
                    res.status(400).json({
                        success: false,
                        error: 'No file uploaded'
                    });
                    return;
                }
                const userId = req.userId || req.body.userId;
                if (!userId) {
                    res.status(400).json({
                        success: false,
                        error: 'User ID is required'
                    });
                    return;
                }
                const filePath = req.file.path;
                const filename = req.file.originalname;
                // Process the uploaded file
                try {
                    const extractedText = await this.fileProcessor.extractTextFromFile(filePath);
                    if (!extractedText || extractedText.trim().length === 0) {
                        res.status(400).json({
                            success: false,
                            error: 'Could not extract text from the uploaded file'
                        });
                        return;
                    }
                    // Parse the resume using OpenAI
                    const parsedData = await this.openaiService.parseResumeText(extractedText);
                    // Save resume to database using Prisma
                    const resume = await prisma_1.default.resume.create({
                        data: {
                            id: (0, uuid_1.v4)(),
                            userId: userId,
                            filename: filename,
                            filePath: filePath,
                            originalText: extractedText,
                            parsedData: parsedData
                        }
                    });
                    res.status(201).json({
                        success: true,
                        data: {
                            id: resume.id,
                            filename: resume.filename,
                            uploadedAt: resume.uploadedAt,
                            parsedData: resume.parsedData
                        }
                    });
                }
                catch (processingError) {
                    console.error('Resume processing error:', processingError);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to process resume file'
                    });
                }
            }
            catch (error) {
                console.error('Resume upload error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to upload resume'
                });
            }
        };
        /**
         * Get user's resumes
         */
        this.getResumes = async (req, res) => {
            try {
                const userId = req.userId || req.params.userId;
                if (!userId) {
                    res.status(400).json({ success: false, error: 'User ID is required' });
                    return;
                }
                const resumes = await prisma_1.default.resume.findMany({
                    where: { userId },
                    orderBy: { uploadedAt: 'desc' },
                    select: {
                        id: true,
                        filename: true,
                        uploadedAt: true,
                        parsedData: true
                    }
                });
                res.json({
                    success: true,
                    data: resumes
                });
            }
            catch (error) {
                console.error('Get resumes error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch resumes'
                });
            }
        };
        /**
         * Get single resume
         */
        this.getResume = async (req, res) => {
            try {
                const resumeId = req.params.resumeId;
                if (!resumeId) {
                    res.status(400).json({ success: false, error: 'Resume ID is required' });
                    return;
                }
                const resume = await prisma_1.default.resume.findUnique({
                    where: { id: resumeId },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                });
                if (!resume) {
                    res.status(404).json({
                        success: false,
                        error: 'Resume not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: resume
                });
            }
            catch (error) {
                console.error('Get resume error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch resume'
                });
            }
        };
        /**
         * Delete resume
         */
        this.deleteResume = async (req, res) => {
            try {
                const resumeId = req.params.resumeId;
                if (!resumeId) {
                    res.status(400).json({ success: false, error: 'Resume ID is required' });
                    return;
                }
                // Get resume to delete associated file
                const resume = await prisma_1.default.resume.findUnique({
                    where: { id: resumeId }
                });
                if (!resume) {
                    res.status(404).json({
                        success: false,
                        error: 'Resume not found'
                    });
                    return;
                }
                // Delete from database
                await prisma_1.default.resume.delete({
                    where: { id: resumeId }
                });
                // Delete file from filesystem
                if (resume.filePath && fs_1.default.existsSync(resume.filePath)) {
                    try {
                        fs_1.default.unlinkSync(resume.filePath);
                    }
                    catch (fileError) {
                        console.warn('Failed to delete resume file:', fileError);
                    }
                }
                res.json({
                    success: true,
                    message: 'Resume deleted successfully'
                });
            }
            catch (error) {
                console.error('Delete resume error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete resume'
                });
            }
        };
        /**
         * Reparse existing resume
         */
        this.reparseResume = async (req, res) => {
            try {
                const resumeId = req.params.resumeId;
                if (!resumeId) {
                    res.status(400).json({ success: false, error: 'Resume ID is required' });
                    return;
                }
                const resume = await prisma_1.default.resume.findUnique({
                    where: { id: resumeId }
                });
                if (!resume) {
                    res.status(404).json({
                        success: false,
                        error: 'Resume not found'
                    });
                    return;
                }
                // Re-parse the resume using OpenAI
                const newParsedData = await this.openaiService.parseResumeText(resume.originalText);
                // Update resume with new parsed data
                const updatedResume = await prisma_1.default.resume.update({
                    where: { id: resumeId },
                    data: {
                        parsedData: newParsedData
                    }
                });
                res.json({
                    success: true,
                    data: {
                        id: updatedResume.id,
                        filename: updatedResume.filename,
                        uploadedAt: updatedResume.uploadedAt,
                        parsedData: updatedResume.parsedData
                    }
                });
            }
            catch (error) {
                console.error('Reparse resume error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to reparse resume'
                });
            }
        };
        /**
         * Get user's resume parsing statistics
         */
        this.getParsingStats = async (req, res) => {
            try {
                const userId = req.userId || req.params.userId;
                // Get resume stats
                const resumeStats = await prisma_1.default.resume.aggregate({
                    where: userId ? { userId } : {},
                    _count: { id: true }
                });
                // Get latest resume upload
                const latestResume = await prisma_1.default.resume.findFirst({
                    where: userId ? { userId } : {},
                    orderBy: { uploadedAt: 'desc' },
                    select: { uploadedAt: true }
                });
                // Get average text length (approximate)
                const resumes = await prisma_1.default.resume.findMany({
                    where: userId ? { userId } : {},
                    select: { originalText: true }
                });
                const avgTextLength = resumes.length > 0
                    ? Math.round(resumes.reduce((sum, r) => sum + r.originalText.length, 0) / resumes.length)
                    : 0;
                // Get interview stats
                const interviewStats = await prisma_1.default.interviewSession.aggregate({
                    where: userId ? { userId } : {},
                    _count: { id: true },
                    _avg: { overallScore: true }
                });
                res.json({
                    success: true,
                    data: {
                        totalResumes: resumeStats._count.id || 0,
                        totalInterviews: interviewStats._count.id || 0,
                        averageScore: Math.round(interviewStats._avg.overallScore || 0),
                        averageTextLength: avgTextLength,
                        lastActivity: latestResume?.uploadedAt || null
                    }
                });
            }
            catch (error) {
                console.error('Get parsing stats error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch statistics'
                });
            }
        };
        this.openaiService = new openai_service_1.OpenAIService(openaiApiKey);
        this.fileProcessor = new fileProcessor_service_1.FileProcessorService();
    }
}
exports.ResumeController = ResumeController;
//# sourceMappingURL=resume.controller.js.map