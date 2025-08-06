"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResumeRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const resume_controller_1 = require("../controllers/resume.controller");
// Multer configuration for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/resumes/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const extension = path_1.default.extname(file.originalname);
        cb(null, `resume-${uniqueSuffix}${extension}`);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
const createResumeRoutes = (openaiApiKey) => {
    const router = (0, express_1.Router)();
    const resumeController = new resume_controller_1.ResumeController(openaiApiKey);
    // Upload and parse resume
    router.post('/upload', upload.single('resume'), resumeController.uploadResume);
    // Get user's resumes
    router.get('/user/:userId', resumeController.getResumes);
    router.get('/', resumeController.getResumes); // For authenticated requests
    // Get specific resume
    router.get('/:resumeId', resumeController.getResume);
    // Delete resume
    router.delete('/:resumeId', resumeController.deleteResume);
    // Re-parse existing resume
    router.post('/:resumeId/reparse', resumeController.reparseResume);
    // Get parsing statistics
    router.get('/user/:userId/stats', resumeController.getParsingStats);
    router.get('/stats', resumeController.getParsingStats); // For authenticated requests
    return router;
};
exports.createResumeRoutes = createResumeRoutes;
//# sourceMappingURL=resume.routes.js.map