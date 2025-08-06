"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const database_1 = require("./models/database");
const resume_routes_1 = require("./routes/resume.routes");
const interview_routes_1 = require("./routes/interview.routes");
const voice_routes_1 = require("./routes/voice.routes");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
// Create required directories
const requiredDirs = [
    './uploads',
    './uploads/resumes',
    './uploads/audio',
    './uploads/audio/tts',
    './uploads/audio/stt',
    './uploads/audio/responses',
    './database',
];
requiredDirs.forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: config_1.config.nodeEnv === 'production' ? [config_1.config.frontendUrl] : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
// Request parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware
if (config_1.config.nodeEnv === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Rate limiting middleware (basic implementation)
const rateLimitMap = new Map();
const rateLimit = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - config_1.config.rateLimit.windowMs;
    // Clean up old entries
    for (const [ip, timestamps] of rateLimitMap.entries()) {
        rateLimitMap.set(ip, timestamps.filter((timestamp) => timestamp > windowStart));
        if (rateLimitMap.get(ip).length === 0) {
            rateLimitMap.delete(ip);
        }
    }
    // Check current IP
    const clientRequests = rateLimitMap.get(clientIp) || [];
    if (clientRequests.length >= config_1.config.rateLimit.requests) {
        return (0, error_middleware_1.rateLimitErrorHandler)(req, res);
    }
    clientRequests.push(now);
    rateLimitMap.set(clientIp, clientRequests);
    next();
};
app.use(rateLimit);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'AI Interview Backend is running',
        timestamp: new Date().toISOString(),
        environment: config_1.config.nodeEnv,
        version: '1.0.0',
        auth: {
            bypassEnabled: config_1.config.auth.bypassAuth,
        },
    });
});
// Authentication endpoints (for testing)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: firstName, lastName, email, password',
            });
        }
        const db = (0, database_1.getDatabase)();
        const userId = (0, uuid_1.v4)();
        // Check if user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists',
            });
        }
        // Create user (in production, hash the password)
        await db.run('INSERT INTO users (id, email, first_name, last_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))', [userId, email, firstName, lastName, null]);
        // Generate JWT token
        const token = (0, auth_middleware_1.generateToken)(userId, email, config_1.config.jwt.secret);
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email,
                    firstName,
                    lastName,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user account',
        });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }
        const db = (0, database_1.getDatabase)();
        // Find user by email
        const user = await db.get('SELECT id, email, first_name, last_name FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password',
            });
        }
        // In production, verify password hash here
        // For testing, we'll accept any password
        // Generate JWT token
        const token = (0, auth_middleware_1.generateToken)(user.id, user.email, config_1.config.jwt.secret);
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});
// Create test user endpoint (development only)
app.post('/api/auth/create-test-user', async (req, res) => {
    if (config_1.config.nodeEnv !== 'development' && !config_1.config.auth.bypassAuth) {
        return res.status(403).json({
            success: false,
            error: 'This endpoint is only available in development mode',
        });
    }
    try {
        const db = (0, database_1.getDatabase)();
        const testUser = config_1.config.auth.testUser;
        // Check if test user already exists
        const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [testUser.id]);
        if (existingUser) {
            return res.json({
                success: true,
                message: 'Test user already exists',
                data: testUser,
            });
        }
        // Create test user
        await db.run('INSERT INTO users (id, email, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))', [testUser.id, testUser.email, testUser.firstName, testUser.lastName]);
        res.json({
            success: true,
            message: 'Test user created successfully',
            data: testUser,
        });
    }
    catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create test user',
        });
    }
});
// API Routes
app.use('/api/resume', (0, resume_routes_1.createResumeRoutes)(config_1.config.openai.apiKey));
app.use('/api/interview', (0, interview_routes_1.createInterviewRoutes)(config_1.config.openai.apiKey, config_1.config.elevenlabs.apiKey, config_1.config.elevenlabs.voiceId));
app.use('/api/voice', (0, voice_routes_1.createVoiceRoutes)(config_1.config.elevenlabs.apiKey, config_1.config.elevenlabs.voiceId, config_1.config.openai.apiKey));
// Serve static files from uploads directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.mp3') || path.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/mpeg');
        }
    },
}));
// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'AI Interview Web Application API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            auth: {
                signup: 'POST /api/auth/signup',
                login: 'POST /api/auth/login',
                createTestUser: 'POST /api/auth/create-test-user (dev only)',
            },
            resume: {
                upload: 'POST /api/resume/upload',
                getAll: 'GET /api/resume/user/:userId',
                getOne: 'GET /api/resume/:resumeId',
                delete: 'DELETE /api/resume/:resumeId',
                reparse: 'POST /api/resume/:resumeId/reparse',
                stats: 'GET /api/resume/user/:userId/stats',
            },
            interview: {
                start: 'POST /api/interview/start',
                submitResponse: 'POST /api/interview/response',
                complete: 'POST /api/interview/:sessionId/complete',
                getSession: 'GET /api/interview/:sessionId',
                getAllSessions: 'GET /api/interview/user/:userId',
                delete: 'DELETE /api/interview/:sessionId',
            },
            voice: {
                textToSpeech: 'POST /api/voice/tts',
                textToSpeechFile: 'POST /api/voice/tts/file',
                speechToText: 'POST /api/voice/stt',
                speechToTextVerbose: 'POST /api/voice/stt/verbose',
                getVoices: 'GET /api/voice/voices',
                getVoice: 'GET /api/voice/voices/:voiceId',
                serveAudio: 'GET /api/voice/audio/:filename',
                requirements: 'GET /api/voice/requirements',
                userInfo: 'GET /api/voice/user/info',
            },
        },
        features: {
            resumeParsing: 'Extract structured data from PDF, DOC, DOCX files',
            aiQuestionGeneration: 'Generate tailored interview questions based on experience',
            voiceInteraction: 'Text-to-speech and speech-to-text capabilities',
            responseEvaluation: 'AI-powered evaluation of interview responses',
            realTimeTranscription: 'Live transcription during interviews',
        },
    });
});
// Error handling middleware (must be last)
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Initialize database and start server
async function startServer() {
    try {
        // Validate required API keys
        if (config_1.config.openai.apiKey === 'your_openai_api_key_here') {
            console.warn('⚠️  Warning: OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
        }
        if (config_1.config.elevenlabs.apiKey === 'your_elevenlabs_api_key_here') {
            console.warn('⚠️  Warning: ElevenLabs API key not configured. Set ELEVENLABS_API_KEY environment variable.');
        }
        // Initialize database (using SQLite for development)
        const db = (0, database_1.getDatabase)(config_1.config.database.sqlite.path);
        await db.initialize();
        console.log('✅ Database initialized successfully');
        // Start server
        const server = app.listen(config_1.config.port, () => {
            console.log(`🚀 AI Interview Backend running on port ${config_1.config.port}`);
            console.log(`📊 Environment: ${config_1.config.nodeEnv}`);
            console.log(`🌐 Health check: http://localhost:${config_1.config.port}/health`);
            console.log(`📖 API docs: http://localhost:${config_1.config.port}/api`);
            if (config_1.config.nodeEnv === 'development') {
                console.log(`🔗 CORS enabled for: ${config_1.config.frontendUrl}`);
            }
        });
        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            server.close(async () => {
                console.log('📴 HTTP server closed');
                try {
                    await db.close();
                    console.log('🗃️  Database connection closed');
                }
                catch (error) {
                    console.error('Error closing database:', error);
                }
                console.log('✅ Graceful shutdown complete');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map