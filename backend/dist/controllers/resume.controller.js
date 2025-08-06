"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../models/database");
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
                    res.status(400).json({ success: false, error: 'No file uploaded' });
                    return;
                }
                const userId = req.userId || req.body.userId;
                if (!userId) {
                    res.status(400).json({ success: false, error: 'User ID is required' });
                    return;
                }
                const db = (0, database_1.getDatabase)();
                const resumeId = (0, uuid_1.v4)();
                const filePath = req.file.path;
                const filename = req.file.originalname;
                // Process the resume file
                const fileProcessing = await this.fileProcessor.processResumeFile(filePath);
                // Estimate extraction quality
                const qualityEstimate = this.fileProcessor.estimateExtractionQuality(fileProcessing.cleanedText);
                if (qualityEstimate.quality === 'poor') {
                    res.status(400).json({
                        success: false,
                        error: 'Poor text extraction quality',
                        details: qualityEstimate.issues,
                    });
                    return;
                }
                // Parse with OpenAI
                const parsedData = await this.openaiService.parseResumeText(fileProcessing.cleanedText);
                // Save to database
                await db.run(`INSERT INTO resumes (id, user_id, filename, file_path, original_text, parsed_data, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`, [
                    resumeId,
                    userId,
                    filename,
                    filePath,
                    fileProcessing.originalText,
                    JSON.stringify(parsedData),
                ]);
                res.status(201).json({
                    success: true,
                    data: {
                        resumeId,
                        parsedData,
                        qualityEstimate,
                        metadata: fileProcessing.metadata,
                    },
                });
            }
            catch (error) {
                console.error('Error uploading resume:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Resume upload failed',
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
                const db = (0, database_1.getDatabase)();
                const resumes = await db.all(`SELECT id, filename, uploaded_at, parsed_data FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC`, [userId]);
                const formattedResumes = resumes.map((resume) => ({
                    id: resume.id,
                    filename: resume.filename,
                    uploadedAt: resume.uploaded_at,
                    parsedData: JSON.parse(resume.parsed_data),
                }));
                res.json({
                    success: true,
                    data: formattedResumes,
                });
            }
            catch (error) {
                console.error('Error fetching resumes:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch resumes',
                });
            }
        };
        /**
         * Get specific resume details
         */
        this.getResume = async (req, res) => {
            try {
                const { resumeId } = req.params;
                const userId = req.userId;
                if (!resumeId) {
                    res.status(400).json({ success: false, error: 'Resume ID is required' });
                    return;
                }
                const db = (0, database_1.getDatabase)();
                const resume = await db.get(`SELECT * FROM resumes WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`, userId ? [resumeId, userId] : [resumeId]);
                if (!resume) {
                    res.status(404).json({ success: false, error: 'Resume not found' });
                    return;
                }
                res.json({
                    success: true,
                    data: {
                        id: resume.id,
                        filename: resume.filename,
                        uploadedAt: resume.uploaded_at,
                        parsedData: JSON.parse(resume.parsed_data),
                        originalText: resume.original_text,
                    },
                });
            }
            catch (error) {
                console.error('Error fetching resume:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch resume',
                });
            }
        };
        /**
         * Delete resume
         */
        this.deleteResume = async (req, res) => {
            try {
                const { resumeId } = req.params;
                const userId = req.userId;
                if (!resumeId) {
                    res.status(400).json({ success: false, error: 'Resume ID is required' });
                    return;
                }
                const db = (0, database_1.getDatabase)();
                // Check if resume exists and belongs to user
                const resume = await db.get(`SELECT file_path FROM resumes WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`, userId ? [resumeId, userId] : [resumeId]);
                if (!resume) {
                    res.status(404).json({ success: false, error: 'Resume not found' });
                    return;
                }
                // Delete file from filesystem
                try {
                    const fs = require('fs');
                    if (fs.existsSync(resume.file_path)) {
                        fs.unlinkSync(resume.file_path);
                    }
                }
                catch (fileError) {
                    console.warn('Could not delete file from filesystem:', fileError);
                }
                // Delete from database
                await db.run(`DELETE FROM resumes WHERE id = ?`, [resumeId]);
                res.json({
                    success: true,
                    message: 'Resume deleted successfully',
                });
            }
            catch (error) {
                console.error('Error deleting resume:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete resume',
                });
            }
        };
        /**
         * Re-parse resume with updated OpenAI prompt
         */
        this.reparseResume = async (req, res) => {
            try {
                const { resumeId } = req.params;
                const userId = req.userId;
                if (!resumeId) {
                    res.status(400).json({ success: false, error: 'Resume ID is required' });
                    return;
                }
                const db = (0, database_1.getDatabase)();
                const resume = await db.get(`SELECT original_text FROM resumes WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`, userId ? [resumeId, userId] : [resumeId]);
                if (!resume) {
                    res.status(404).json({ success: false, error: 'Resume not found' });
                    return;
                }
                // Re-parse with OpenAI
                const parsedData = await this.openaiService.parseResumeText(resume.original_text);
                // Update database
                await db.run(`UPDATE resumes SET parsed_data = ?, updated_at = datetime('now') WHERE id = ?`, [JSON.stringify(parsedData), resumeId]);
                res.json({
                    success: true,
                    data: parsedData,
                });
            }
            catch (error) {
                console.error('Error re-parsing resume:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to re-parse resume',
                });
            }
        };
        /**
         * Get resume parsing statistics
         */
        this.getParsingStats = async (req, res) => {
            try {
                const userId = req.userId || req.params.userId;
                const db = (0, database_1.getDatabase)();
                const stats = await db.get(`
        SELECT 
          COUNT(*) as total_resumes,
          AVG(LENGTH(original_text)) as avg_text_length,
          MAX(uploaded_at) as latest_upload
        FROM resumes 
        ${userId ? 'WHERE user_id = ?' : ''}
      `, userId ? [userId] : []);
                res.json({
                    success: true,
                    data: {
                        totalResumes: stats.total_resumes || 0,
                        averageTextLength: Math.round(stats.avg_text_length || 0),
                        latestUpload: stats.latest_upload,
                    },
                });
            }
            catch (error) {
                console.error('Error fetching parsing stats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch parsing statistics',
                });
            }
        };
        this.openaiService = new openai_service_1.OpenAIService(openaiApiKey);
        this.fileProcessor = new fileProcessor_service_1.FileProcessorService();
    }
}
exports.ResumeController = ResumeController;
//# sourceMappingURL=resume.controller.js.map